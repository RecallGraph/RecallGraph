'use strict'

// noinspection NpmUsedModulesInstalled
const { db, query } = require('@arangodb')
const { SERVICE_COLLECTIONS, COLLECTION_TYPES, getCollectionType, SERVICE_GRAPHS } = require('../lib/helpers')
const { getNonServiceCollections } = require('../lib/operations/helpers')
// noinspection NpmUsedModulesInstalled
const { chain, pick } = require('lodash')

const edgeCollections = getNonServiceCollections().filter(coll => getCollectionType(coll) === COLLECTION_TYPES.EDGE)
const vertexCollections = getNonServiceCollections().filter(coll => getCollectionType(coll) === COLLECTION_TYPES.VERTEX)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
const skeletonEdgeHubsColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeHubs)
const skeletonEdgeSpokesColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeSpokes)
// noinspection JSUnresolvedVariable
const limit = module.context.service.configuration['skeleton-graph-update-batch-size']
const skeletonCollections = {
  [COLLECTION_TYPES.VERTEX]: skeletonVerticesColl,
  [COLLECTION_TYPES.EDGE]: skeletonEdgeHubsColl
}

const syncResults = {}

// Sync Vertex Create Events
syncResults.vertexCreate = syncVertexCreates()

// Sync Vertex Delete Events
syncResults.vertexDelete = syncVertexDeletes()

// Sync Edge Create Events
syncResults.edgeCreate = syncEdgeCreates()

// Sync Edge Move Events
syncResults.edgeMove = syncEdgeMoves()

// Sync Edge Delete Events
syncResults.edgeDelete = syncEdgeDeletes()

module.exports = syncResults

function syncVertexCreates () {
  return query`
    for e in ${eventColl}
      filter e.event == 'created'
      filter parse_identifier(e.meta._id).collection in ${vertexCollections}
      let sv = (
        for s in ${skeletonVerticesColl}
          filter s.meta._id == e.meta._id
        return 1
      )
      filter length(sv) == 0
    insert {meta: keep(e.meta, '_id', '_key'), valid_since: e.ctime} into ${skeletonVerticesColl}
    return {skid: NEW._id, nid: NEW.meta._id}
  `.toArray()
}

function syncVertexDeletes () {
  return query`
    for e in ${eventColl}
      filter e.event == 'deleted'
      filter parse_identifier(e.meta._id).collection in ${vertexCollections}
      for s in ${skeletonVerticesColl}
        filter (s.meta._id == e.meta._id) && !s.valid_until
        update s with { valid_until: e.ctime } into ${skeletonVerticesColl}
    return {skid: s._id, nid: s.meta._id}
  `.toArray()
}

function syncEdgeCreates () {
  const results = []

  const unsyncedEdgeCreates = query`
    for e in ${eventColl}
      filter e.event == 'created'
      filter parse_identifier(e.meta._id).collection in ${edgeCollections}
      let sv = (
        for s in ${skeletonEdgeHubsColl}
          filter s.meta._id == e.meta._id
        return 1
      )
      filter length(sv) == 0
      limit ${limit}
    return {meta: keep(e.meta, '_id', '_key', '_from', '_to'), valid_since: e.ctime}
  `.toArray()

  // noinspection JSUnresolvedFunction
  const groupedRefs = chain(unsyncedEdgeCreates)
    .map(event => chain(event.meta).pick('_from', '_to').values().value())
    .flatten()
    .uniq()
    .reduce((acc, node) => {
      const collName = node.split('/')[0]
      const type = getCollectionType(collName)

      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(node)

      return acc
    }, {})
    .flatMap((value, key) =>
      query`
        let nodes = ${value}
        for n in nodes
          let sv = (
            for s in ${skeletonCollections[key]}
              filter s.meta._id == n
            return s._id
          )
        return [n, sv]
      `.toArray())
    .fromPairs()
    .value()

  unsyncedEdgeCreates
    .filter(event => chain(event.meta).pick('_from', '_to').values().every(value => groupedRefs[value].length).value())
    .forEach(event => {
      const { hubNode, fromSpokeNode, toSpokeNode } = db._executeTransaction({
        collections: {
          write: [SERVICE_COLLECTIONS.skeletonEdgeHubs, SERVICE_COLLECTIONS.skeletonEdgeSpokes]
        },
        action: function (params) {
          // noinspection NpmUsedModulesInstalled
          const { db } = require('@arangodb')
          const { SERVICE_COLLECTIONS } = require('../lib/helpers')

          const skeletonEdgeHubsColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeHubs)
          const skeletonEdgeSpokesColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeSpokes)
          const { event, groupedRefs } = params

          const hubNode = skeletonEdgeHubsColl.insert(event)
          const fromNode = groupedRefs[event.meta._from][0]
          const toNode = groupedRefs[event.meta._to][0]

          const fromSpokeNode = skeletonEdgeSpokesColl.insert({
            _from: fromNode,
            _to: hubNode._id,
            hub: hubNode._id,
            valid_since: event.valid_since
          }, { returnNew: true }).new
          const toSpokeNode = skeletonEdgeSpokesColl.insert({
            _from: hubNode._id,
            _to: toNode,
            hub: hubNode._id,
            valid_since: event.valid_since
          }, { returnNew: true }).new

          return { hubNode, fromSpokeNode, toSpokeNode }
        },
        params: { event, groupedRefs }
      })

      results.push({
        skhub: hubNode._id,
        skspokes: {
          from: pick(fromSpokeNode, '_id', '_from', '_to'),
          to: pick(toSpokeNode, '_id', '_from', '_to')
        }
      })
    })

  return results
}

function syncEdgeMoves () {
  const results = []

  const unsyncedEdgeMoves = query`
    for e in ${eventColl}
      filter e.event == 'updated'
      filter (has(e.meta, '_fromNew') || has(e.meta, '_toNew'))
      let refs = keep(e.meta, '_fromNew', '_fromOld', '_toNew', '_toOld', '_id')
      let sv1 = (
        for a in attributes(refs)
          for s in ${skeletonEdgeHubsColl}
            filter s.meta._id == refs[a]
          return {[a]: s._id}
      )
      let sv2 = (
        for a in attributes(refs)
          for s in ${skeletonVerticesColl}
            filter s.meta._id == refs[a]
          return {[a]: s._id}
      )
      let sv = merge(append(sv1,sv2))
      filter length(sv) == length(refs)
      let se = (
        for v, ee, p in 1
        any sv._id
        graph ${SERVICE_GRAPHS.skeleton}
          filter v._id in values(sv)
        return keep(ee, '_key', '_from', '_to')
      )
      filter length(se) < length(refs) - 1
      limit ${limit}
    return {sv, time: e.ctime, se}
  `.toArray()

  for (let event of unsyncedEdgeMoves) {
    const spokeOps = db._executeTransaction({
      collections: {
        write: [SERVICE_COLLECTIONS.skeletonEdgeSpokes]
      },
      action: function (event) {
        // noinspection NpmUsedModulesInstalled
        const { db } = require('@arangodb')

        const skeletonEdgeSpokesColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeSpokes)
        const inserts = []
        const updateKeys = []
        const updateValues = []
        const refs = {
          _from: ['_fromOld', '_fromNew', '_to'],
          _to: ['_toOld', '_toNew', '_from']
        }

        for (let ref in refs) {
          // noinspection JSUnresolvedVariable
          if (event.sv[refs[ref][0]]) {
            // noinspection JSUnresolvedVariable
            const handle = event.se.find(e => e[ref] === event.sv[refs[ref][0]])._key
            updateKeys.push(handle)
            updateValues.push({ valid_until: event.time })

            // noinspection JSUnresolvedVariable
            inserts.push({
              hub: event.sv._id,
              valid_since: event.time,
              [ref]: event.sv[refs[ref][1]],
              [refs[ref][2]]: event.sv._id
            })
          }
        }

        const i = skeletonEdgeSpokesColl.insert(inserts, { returnNew: true })
        const u = skeletonEdgeSpokesColl.update(updateKeys, updateValues, { returnNew: true })

        return {
          inserts: i.map(e => pick(e.new, '_id', '_from', '_to')),
          expiries: u.map(e => pick(e.new, '_id', '_from', '_to'))
        }
      },
      params: event
    })

    // noinspection JSUnresolvedVariable
    results.push({
      skhub: event.sv._id,
      skspokes: spokeOps
    })
  }

  return results
}

function syncEdgeDeletes () {
  return query`
    for e in ${eventColl}
      filter e.event == 'deleted'
      filter parse_identifier(e.meta._id).collection in ${edgeCollections}
      for s in ${skeletonEdgeHubsColl}
        filter (s.meta._id == e.meta._id) && !s.valid_until
        update s with { valid_until: e.ctime } into ${skeletonEdgeHubsColl}
        for ss in ${skeletonEdgeSpokesColl}
          filter ss.hub == s._id and !ss.valid_until
          update ss with { valid_until: e.ctime } into ${skeletonEdgeSpokesColl}
          collect skhub = {hub: s._id, nid: s.meta._id} into skspokes = ss._id
    return {skhub, skspokes}
  `.toArray()
}
