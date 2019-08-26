'use strict'

// noinspection NpmUsedModulesInstalled
const { db, query } = require('@arangodb')
const { SERVICE_COLLECTIONS, COLLECTION_TYPES, getCollectionType } = require('../lib/helpers')
const { getNonServiceCollections } = require('../lib/operations/helpers')

const edgeCollections = getNonServiceCollections().filter(coll => getCollectionType(coll) === COLLECTION_TYPES.EDGE)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const skeletonEdgeHubsColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeHubs)
// noinspection JSUnresolvedVariable
const limit = module.context.service.configuration['skeleton-graph-update-batch-size']

// Sync Edge Delete Events
module.exports = query`
  for e in ${eventColl}
    filter e.event == 'deleted'
    filter parse_identifier(e.meta._id).collection in ${edgeCollections}
    let sv = (
      for s in ${skeletonEdgeHubsColl}
        filter (s.meta._id == e.meta._id) && !s.valid_until
      return s._key
    )
    filter length(sv) == 1
    limit ${limit}
  update sv[0] with { valid_until: e.ctime } into ${skeletonEdgeHubsColl}
  return {skid: NEW._id, nid: NEW.meta._id}
`.toArray()
