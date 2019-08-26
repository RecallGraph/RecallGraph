'use strict'

// noinspection NpmUsedModulesInstalled
const { db, query } = require('@arangodb')
const { SERVICE_COLLECTIONS, COLLECTION_TYPES, getCollectionType } = require('../lib/helpers')
const { getNonServiceCollections } = require('../lib/operations/helpers')

const edgeCollections = getNonServiceCollections().filter(coll => getCollectionType(coll) === COLLECTION_TYPES.EDGE)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const skeletonEdgeHubsColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeHubs)
const skeletonEdgeSpokesColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeSpokes)

// Sync Edge Delete Events
module.exports = query`
  for e in ${eventColl}
    filter e.event == 'deleted'
    filter parse_identifier(e.meta._id).collection in ${edgeCollections}
    for s in ${skeletonEdgeHubsColl}
      filter (s.meta._id == e.meta._id) && !s.valid_until
      update s with { valid_until: e.ctime } into ${skeletonEdgeHubsColl}
      for ss in ${skeletonEdgeSpokesColl}
        filter ss.hub == s._id and !ss.valid_until
        update ss with { valid_until: e.ctime } into ${skeletonEdgeSpokesColl}
        collect skhub = {hub: s._id, nid: s.meta._id} into skspokes = ss._id
  return {skhub, skspokes}
`.toArray()
