'use strict'

const { db } = require('@arangodb')
const { SERVICE_COLLECTIONS } = require('../lib/helpers')

const [nodeId, time] = module.context.argv

module.exports = expireSkeletonNode(nodeId, time)

function expireSkeletonNode (nodeId, time) {
  return db._executeTransaction({
    collections: {
      write: [SERVICE_COLLECTIONS.skeletonVertices, SERVICE_COLLECTIONS.skeletonEdges]
    },
    waitForSync: true,
    action: function (params) {
      const { db, query } = require('@arangodb')
      const {
        SERVICE_COLLECTIONS,
        COLLECTION_TYPES
      } = require('../lib/helpers')

      const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
      const skeletonEdgesColl = db._collection(SERVICE_COLLECTIONS.skeletonEdges)
      const skeletonCollectionTypes = {
        [COLLECTION_TYPES.VERTEX]: skeletonVerticesColl,
        [COLLECTION_TYPES.EDGE]: skeletonEdgesColl
      }

      const { nodeId, time } = params
      const collName = nodeId.split('/')[0]
      const collType = db._collection(collName).type()
      const coll = skeletonCollectionTypes[collType]

      const cursor = query`
        for v in ${coll}
          filter v.meta._id == ${nodeId}
          update v with {valid_until: ${time}} in ${coll}
        return NEW
      `

      let newNode = null
      if (cursor.hasNext()) {
        newNode = cursor.next()
      }
      cursor.dispose()

      return newNode
    },
    params: { nodeId, time }
  })
}
