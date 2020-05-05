'use strict'

const { SERVICE_COLLECTIONS, getComponentTagOption } = require('../../helpers')
const { pickBy, has } = require('lodash')
const { utils: { attachSpan, executeTransaction } } = require('foxx-tracing')

const cto = getComponentTagOption(__filename)
const {
  events, commands, snapshots, snapshotLinks, evtSSLinks, skeletonVertices, skeletonEdgeHubs, skeletonEdgeSpokes
} = SERVICE_COLLECTIONS

const commitFn = function commit (collName, node, op, { returnNew = false, returnOld = false, silent = false } = {},
  options = {}) {
  const result = executeTransaction({
    collections: {
      write: [
        collName,
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
    action: params => {
      const { pick, has, omit, assign } = require('lodash')
      const { DB_OPS, COLLECTION_TYPES, getCollectionType } = require('../../helpers')
      const {
        prepInsert, prepReplace, prepRemove, prepUpdate, insertEventNode, insertCommandEdge, insertEvtSSLink, metaize,
        updateSkeletonGraph
      } = require('./helpers')

      const prepOpMap = {
        [DB_OPS.INSERT]: prepInsert,
        [DB_OPS.REPLACE]: prepReplace,
        [DB_OPS.REMOVE]: prepRemove,
        [DB_OPS.UPDATE]: prepUpdate
      }

      const { op, collName, node, options } = params
      if (has(prepOpMap, op)) {
        const { result, event, time, prevEvent, ssData } = prepOpMap[op](collName, node, options)
        const meta = metaize(omit(result, 'new', 'old'))

        if (getCollectionType(collName) === COLLECTION_TYPES.EDGE) {
          switch (event) {
            case 'created':
              assign(meta, metaize(pick(result.new, '_from', '_to')))

              break

            case 'updated':
              if (result.new._from !== result.old._from) {
                meta.fromNew = result.new._from
                meta.fromOld = result.old._from
              }
              if (result.new._to !== result.old._to) {
                meta.toNew = result.new._to
                meta.toOld = result.old._to
              }

              break
          }
        }

        const evtNode = insertEventNode(meta, time, event, ssData, prevEvent, collName)

        insertCommandEdge(prevEvent, evtNode, result.old, result.new)

        if (ssData.ssNode && ssData.hopsFromLast === 1) {
          insertEvtSSLink(evtNode._id, ssData.ssNode._id)
        }

        updateSkeletonGraph(evtNode)

        return result
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

module.exports = attachSpan(commitFn, 'commit', cto)
