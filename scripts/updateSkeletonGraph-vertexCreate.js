'use strict'

// noinspection NpmUsedModulesInstalled
const { db, query } = require('@arangodb')
const { SERVICE_COLLECTIONS, COLLECTION_TYPES, getCollectionType } = require('../lib/helpers')
const { getNonServiceCollections } = require('../lib/operations/helpers')

const vertexCollections = getNonServiceCollections().filter(coll => getCollectionType(coll) === COLLECTION_TYPES.VERTEX)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)

// Sync Vertex Create Events
module.exports = query`
  for e in ${eventColl}
    filter e.event == 'created'
    filter parse_identifier(e.meta._id).collection in ${vertexCollections}
    let sv = (
      for s in ${skeletonVerticesColl}
        filter s.meta._id == e.meta._id
      return 1
    )
    filter length(sv) == 0
  insert {meta: keep(e.meta, '_id', '_key'), valid_since: e.ctime} into ${skeletonVerticesColl}
  return {skid: NEW._id, nid: NEW.meta._id}
`.toArray()
