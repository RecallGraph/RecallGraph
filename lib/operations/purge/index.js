'use strict'

const { utils: { attachSpan, executeTransaction } } = require('foxx-tracing')
const { SERVICE_COLLECTIONS, getComponentTagOption } = require('../../helpers')
const { db } = require('@arangodb')
const { set, chain, omit, get } = require('lodash')
const log = require('../log')

const cto = getComponentTagOption(__filename)
const {
  events, commands, snapshots, snapshotLinks, evtSSLinks, skeletonVertices, skeletonEdgeHubs, skeletonEdgeSpokes
} = SERVICE_COLLECTIONS

function purge (path = '/', { deleteUserObjects = false, silent = false } = {}) {
  let nidGroups
  let result = {}
  do {
    nidGroups = log(path, { groupBy: 'node', limit: 100 })

    const txResult = executeTransaction({
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
      action: nidGroups => {
        const { map } = require('lodash')
        const { getCollectionType, COLLECTION_TYPES } = require('../../helpers')
        const {
          removeSkeletonVertices, removeSkeletonEdgeHubs, removeSkeletonEdgeSpokes, removeSnapshots, removeSnapshotLinks,
          removeEventSnapshotLinks, removeCommands, removeEvents
        } = require('./helpers')

        const svcResult = {}
        const nids = map(nidGroups, 'node')

        if (deleteUserObjects) {
          svcResult.nids = nids
        }

        const typeGroups = nids.reduce((acc, id) => {
          const [coll] = id.split('/')
          const type = getCollectionType(coll)

          if (!acc[type]) {
            acc[type] = []
          }
          acc[type].push(id)

          return acc
        }, {})

        try {
          if (typeGroups.hasOwnProperty(COLLECTION_TYPES.VERTEX)) {
            svcResult.sv = removeSkeletonVertices(typeGroups[COLLECTION_TYPES.VERTEX]).length
          }

          if (typeGroups.hasOwnProperty(COLLECTION_TYPES.EDGE)) {
            const seh = removeSkeletonEdgeHubs(typeGroups[COLLECTION_TYPES.EDGE])
            svcResult.seh = seh.length
            svcResult.ses = removeSkeletonEdgeSpokes(seh).length
          }

          const ss = removeSnapshots(nids)
          svcResult.ss = ss.length

          svcResult.ssl = removeSnapshotLinks(ss).length
          svcResult.essl = removeEventSnapshotLinks(ss).length

          const eids = nidGroups.flatMap(group => map(group.events, '_id'))
          svcResult.evt = removeEvents(eids).length

          svcResult.cmd = removeCommands(eids).length

          return svcResult
        } catch (e) {
          console.error(e.stack)

          throw e
        }
      },
      params: nidGroups
    })

    if (!silent) {
      for (const key in omit(txResult, 'nids')) {
        if (!result[key]) {
          result[key] = 0
        }

        result[key] += txResult[key]
      }
    }

    if (deleteUserObjects) {
      const collGroups = txResult.nids.reduce((acc, id) => {
        const [coll, key] = id.split('/')

        if (!acc[coll]) {
          acc[coll] = []
        }
        acc[coll].push(key)

        return acc
      }, {})

      for (const coll in collGroups) {
        const deleted = db._collection(coll).remove(collGroups[coll])
        const dCount = chain(deleted).map('_key').filter().size().value()

        if (!get(result, ['user', coll])) {
          set(result, ['user', coll], 0)
        }

        result.user[coll] += dCount
      }
    }
  } while (nidGroups.length)

  return silent ? {} : result
}

module.exports = attachSpan(purge, 'purge', cto)
