'use strict'

const { utils: { attachSpan, executeTransaction } } = require('foxx-tracing')
const { SERVICE_COLLECTIONS, getComponentTagOption } = require('../../helpers')
const { db } = require('@arangodb')
const { set, chain } = require('lodash')

const cto = getComponentTagOption(__filename)
const {
  events, commands, snapshots, snapshotLinks, evtSSLinks, skeletonVertices, skeletonEdgeHubs, skeletonEdgeSpokes
} = SERVICE_COLLECTIONS

function purge (path = '/', { deleteUserObjects = false, silent = false } = {}) {
  const result = executeTransaction({
    collections: {
      write: [
        events,
        commands,
        snapshots,
        snapshotLinks,
        evtSSLinks,
        skeletonVertices,
        skeletonEdgeHubs,
        skeletonEdgeSpokes
      ]
    },
    action: path => {
      const log = require('../log')
      const { map } = require('lodash')
      const { getCollectionType, COLLECTION_TYPES } = require('../../helpers')
      const {
        removeSkeletonVertices, removeSkeletonEdgeHubs, removeSkeletonEdgeSpokes, removeSnapshots, removeSnapshotLinks,
        removeEventSnapshotLinks, removeCommands, removeEvents
      } = require('./helpers')

      const result = {}
      const nidGroups = log(path, { groupBy: 'node' })
      const nids = map(nidGroups, 'node')
      result.nids = nids

      const typeGroups = nids.reduce((acc, id) => {
        const [coll] = id.split('/')
        const type = getCollectionType(coll)

        if (!acc[type]) {
          acc[type] = []
        }
        acc[type].push(id)

        return acc
      }, {})

      result.sv = removeSkeletonVertices(typeGroups[COLLECTION_TYPES.VERTEX])

      const seh = removeSkeletonEdgeHubs(typeGroups[COLLECTION_TYPES.EDGE])
      result.seh = seh

      result.ses = removeSkeletonEdgeSpokes(seh)

      const ss = removeSnapshots(nids)
      result.ss = ss

      result.ssl = removeSnapshotLinks(ss)
      result.essl = removeEventSnapshotLinks(ss)

      const eids = nidGroups.flatMap(group => map(group.events, '_id'))
      removeEvents(eids)
      result.evt = eids

      result.cmd = removeCommands(eids)

      return result
    },
    params: path
  })

  if (deleteUserObjects) {
    const collGroups = result.nids.reduce((acc, id) => {
      const [coll, key] = id.split('/')

      if (!acc[coll]) {
        acc[coll] = []
      }
      acc[coll].push(key)

      return acc
    }, {})

    for (const coll in collGroups) {
      const deleted = db._collection(coll).remove(collGroups[coll])
      const keys = chain(deleted).map('_key').filter().value()

      set(result, ['user', coll], keys)
    }
  }

  return silent ? {} : result
}

module.exports = attachSpan(purge, 'purge', cto)
