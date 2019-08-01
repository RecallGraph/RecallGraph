'use strict'

const { db } = require('@arangodb')
const { SERVICE_COLLECTIONS } = require('../lib/helpers')

const [nodeMeta, time] = module.context.argv

module.exports = upsertSkeletonNode(nodeMeta, time)

function upsertSkeletonNode (nodeMeta, time) {
  return db._executeTransaction({
    collections: {
      write: [SERVICE_COLLECTIONS.skeletonVertices, SERVICE_COLLECTIONS.skeletonEdges]
    },
    waitForSync: true,
    action: txnAction,
    params: { nodeMeta, time }
  })
}

function txnAction (params) {
  const { db, query } = require('@arangodb')
  const {
    SERVICE_COLLECTIONS,
    COLLECTION_TYPES
  } = require('../lib/helpers')
  const { pick } = require('lodash')

  const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
  const skeletonEdgesColl = db._collection(SERVICE_COLLECTIONS.skeletonEdges)
  const skeletonCollectionTypes = {
    [COLLECTION_TYPES.VERTEX]: skeletonVerticesColl,
    [COLLECTION_TYPES.EDGE]: skeletonEdgesColl
  }

  const { nodeMeta, time } = params
  const collName = nodeMeta._id.split('/')[0]
  const collType = db._collection(collName).type()

  const skeletonNode = {
    meta: nodeMeta,
    valid_since: time,
    valid_until: null,
    materialized: []
  }

  if (collType === COLLECTION_TYPES.EDGE) {
    if (nodeMeta.ghost) {
      Object.assign(skeletonNode, pick(nodeMeta, '_from', '_to'))
    } else {
      for (let ref of ['_from', '_to']) {
        const refParts = nodeMeta[ref].split('/')
        const refCollName = refParts[0]
        const refCollType = db._collection(refCollName).type()
        const refNode = skeletonCollectionTypes[refCollType].firstExample({ 'meta._id': nodeMeta[ref] })

        if (refNode) {
          skeletonNode[ref] = refNode._id
        } else {
          const ghostMeta = {
            ghost: true,
            _id: nodeMeta[ref],
            _key: refParts[1]
          }

          if (db._collection(refCollName).type() === COLLECTION_TYPES.EDGE) {
            ghostMeta._from = `${SERVICE_COLLECTIONS.skeletonVertices}/0`
            ghostMeta._to = `${SERVICE_COLLECTIONS.skeletonVertices}/0`
          }

          const ghostRef = txnAction({ nodeMeta: ghostMeta, time: null })

          skeletonNode[ref] = ghostRef._id
        }
      }
    }
  }

  const cursor = query`
    upsert {meta: {_id: ${nodeMeta._id}}}
      insert ${skeletonNode}
      update ${Object.assign({ ghost: null }, pick(skeletonNode, 'meta', 'valid_since'))}
    in ${skeletonCollectionTypes[collType]} options {keepNull: false, mergeObjects: false}
    return NEW
  `

  const newNode = cursor.next()
  cursor.dispose()

  return newNode
}
