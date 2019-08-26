'use strict'

// noinspection NpmUsedModulesInstalled
const { db, query } = require('@arangodb')
const { SERVICE_COLLECTIONS, COLLECTION_TYPES, getCollectionType } = require('../lib/helpers')
const { getNonServiceCollections } = require('../lib/operations/helpers')

const vertexCollections = getNonServiceCollections().filter(coll => getCollectionType(coll) === COLLECTION_TYPES.VERTEX)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
// noinspection JSUnresolvedVariable
const limit = module.context.service.configuration['skeleton-graph-update-batch-size']

// Sync Vertex Delete Events
module.exports = query`
  for e in ${eventColl}
    filter e.event == 'deleted'
    filter parse_identifier(e.meta._id).collection in ${vertexCollections}
    let sv = (
      for s in ${skeletonVerticesColl}
        filter (s.meta._id == e.meta._id) && !s.valid_until
      return s._key
    )
    filter length(sv) == 1
    limit ${limit}
  update sv[0] with { valid_until: e.ctime } into ${skeletonVerticesColl}
  return {skid: NEW._id, nid: NEW.meta._id}
`.toArray()
