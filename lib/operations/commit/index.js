'use strict'

const { db } = require('@arangodb')
const { SERVICE_COLLECTIONS } = require('../../helpers')
const DB_OPS = require('../../helpers').DB_OPS
const { pick, pickBy, has } = require('lodash')
const { upsertSkeletonNode, expireSkeletonNode } = require('./helpers')

const { events, commands, snapshots, evtSSLinks, skeletonVertices, skeletonEdges } = SERVICE_COLLECTIONS

module.exports = function commit (
  collName,
  node,
  op,
  { returnNew = false, returnOld = false, silent = false } = {},
  options = {}
) {
  // noinspection JSUnusedGlobalSymbols
  const result = db._executeTransaction({
    collections: {
      write: [collName, events, commands, snapshots, evtSSLinks, skeletonVertices, skeletonEdges]
    },
    action: params => {
      const { has, omit, assign } = require('lodash')
      const DB_OPS = require('../../helpers').DB_OPS
      const {
        prepInsert,
        prepReplace,
        prepRemove,
        prepUpdate,
        insertEventNode,
        insertCommandEdge,
        insertEvtSSLink
      } = require('./helpers')

      const prepOpMap = {
        [DB_OPS.INSERT]: prepInsert,
        [DB_OPS.REPLACE]: prepReplace,
        [DB_OPS.REMOVE]: prepRemove,
        [DB_OPS.UPDATE]: prepUpdate
      }

      if (has(prepOpMap, params.op)) {
        const { result, event, time, prevEvent, ssData } = prepOpMap[params.op](
          params.collName,
          params.node,
          params.options
        )
        const evtNode = insertEventNode(
          omit(result, 'new', 'old'),
          time,
          event,
          ssData
        )

        insertCommandEdge(prevEvent, evtNode, result.old, result.new)

        if (ssData.ssNode && ssData.hopsFromLast === 1) {
          insertEvtSSLink(evtNode._id, ssData.ssNode._id)
        }

        return assign(result, { time })
      } else {
        throw new Error(`Unknown op: ${op}`)
      }
    },
    params: {
      collName,
      node,
      op,
      options
    }
  })

  switch (op) {
    case DB_OPS.INSERT:
      upsertSkeletonNode(pick(result.new, '_id', '_key', '_from', '_to'), result.time)
      break

    case DB_OPS.REMOVE:
      expireSkeletonNode(result._id, result.time)
      break
  }

  if (!silent) {
    const keyMap = {
      old: returnOld,
      new: returnNew
    }

    return pickBy(result, (value, key) =>
      has(keyMap, key) ? keyMap[key] : true
    )
  }
}
