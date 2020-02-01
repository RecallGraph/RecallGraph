'use strict'

const { db } = require('@arangodb')
const { SERVICE_COLLECTIONS } = require('../../helpers')

const { pickBy, has } = require('lodash')

const { events, commands, snapshots, snapshotLinks, evtSSLinks } = SERVICE_COLLECTIONS

module.exports = function commit (
  collName,
  node,
  op,
  { returnNew = false, returnOld = false, silent = false } = {},
  options = {}
) {
  const result = db._executeTransaction({
    collections: {
      write: [collName, events, commands, snapshots, snapshotLinks, evtSSLinks]
    },
    action: params => {
      const { pick, has, omit, assign } = require('lodash')
      const { DB_OPS, COLLECTION_TYPES, getCollectionType } = require(
        '../../helpers')
      const {
        prepInsert,
        prepReplace,
        prepRemove,
        prepUpdate,
        insertEventNode,
        insertCommandEdge,
        insertEvtSSLink,
        metaize
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

        const meta = metaize(omit(result, 'new', 'old'))
        if (getCollectionType(params.collName) === COLLECTION_TYPES.EDGE) {
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

        const evtNode = insertEventNode(
          meta,
          time,
          event,
          ssData,
          prevEvent
        )

        insertCommandEdge(prevEvent, evtNode, result.old, result.new)

        if (ssData.ssNode && ssData.hopsFromLast === 1) {
          insertEvtSSLink(evtNode._id, ssData.ssNode._id)
        }

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
