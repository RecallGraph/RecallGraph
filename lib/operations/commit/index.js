'use strict'

const { getComponentTagOption } = require('../../helpers')
const { SERVICE_COLLECTIONS, EVENTS: { CREATED, UPDATED } } = require(
  '../../constants')
const { pickBy, has } = require('lodash')
const { utils: { attachSpan, executeTransaction } } = require('@recallgraph/foxx-tracer')

const cto = getComponentTagOption(__filename)
const {
  events, commands, snapshots, snapshotLinks, evtSSLinks, skeletonVertices, skeletonEdgeHubs, skeletonEdgeSpokes
} = SERVICE_COLLECTIONS

function commit (collName, node, op, {
  returnNew = false,
  returnOld = false,
  silent = false
} = {},
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
      try {
        const { pick, has, omit, assign } = require('lodash')
        const { getCollectionType } = require('../../helpers')
        const {
          DB_OPS: { INSERT, REPLACE, REMOVE, UPDATE, RESTORE }, COLLECTION_TYPES: { EDGE }
        } = require('../../constants')
        const {
          prepInsert, prepReplace, prepRemove, prepUpdate, prepRestore, insertEventNode, insertCommandEdge,
          insertEvtSSLink, metaize, updateSkeletonGraph
        } = require('./helpers')

        const prepOpMap = {
          [INSERT]: prepInsert,
          [REPLACE]: prepReplace,
          [REMOVE]: prepRemove,
          [UPDATE]: prepUpdate,
          [RESTORE]: prepRestore
        }

        const { op, collName, node, options } = params
        if (has(prepOpMap, op)) {
          const { result, event, time, prevEvent, ssData } = prepOpMap[op](collName, node, options)
          const meta = metaize(omit(result, 'new', 'old'))

          if (getCollectionType(collName) === EDGE) {
            switch (event) {
              case CREATED:
                assign(meta, metaize(pick(result.new, '_from', '_to')))

                break

              case UPDATED:
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
        }
      } catch (e) {
        console.error(e.stack)

        throw e
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
  } else {
    return {}
  }
}

module.exports = attachSpan(commit, 'commit', cto)
