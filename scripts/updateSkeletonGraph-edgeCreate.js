'use strict'

// noinspection NpmUsedModulesInstalled
const { db, query } = require('@arangodb')
const { SERVICE_COLLECTIONS, COLLECTION_TYPES, getCollectionType } = require('../lib/helpers')
const { getNonServiceCollections } = require('../lib/operations/helpers')
// noinspection NpmUsedModulesInstalled
const { chain, pick } = require('lodash')

const edgeCollections = getNonServiceCollections().filter(coll => getCollectionType(coll) === COLLECTION_TYPES.EDGE)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const skeletonEdgeHubsColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeHubs)
const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
// noinspection JSUnresolvedVariable
const limit = module.context.service.configuration['skeleton-graph-update-batch-size']
const skeletonCollections = {
  [COLLECTION_TYPES.VERTEX]: skeletonVerticesColl,
  [COLLECTION_TYPES.EDGE]: skeletonEdgeHubsColl
}

// Sync Edge Create Events
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

const syncResults = []

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

    syncResults.push({
      skhub: hubNode._id,
      skspokes: {
        from: pick(fromSpokeNode, '_id', '_from', '_to'),
        to: pick(toSpokeNode, '_id', '_from', '_to')
      }
    })
  })

module.exports = syncResults
