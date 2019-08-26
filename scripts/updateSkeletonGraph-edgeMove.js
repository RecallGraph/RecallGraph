'use strict'

// noinspection NpmUsedModulesInstalled
const { db, query } = require('@arangodb')
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../lib/helpers')
// noinspection NpmUsedModulesInstalled
const { pick } = require('lodash')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const skeletonEdgeHubsColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeHubs)
const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
// noinspection JSUnresolvedVariable
const limit = module.context.service.configuration['skeleton-graph-update-batch-size']

// Sync Edge Move Events
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

const syncResults = []

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
  syncResults.push({
    skhub: event.sv._id,
    skspokes: spokeOps
  })
}

module.exports = syncResults
