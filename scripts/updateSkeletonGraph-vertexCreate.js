'use strict'

// noinspection NpmUsedModulesInstalled
const { db, query } = require('@arangodb')
const { SERVICE_COLLECTIONS } = require('../lib/helpers')
const { getNonServiceCollections } = require('../lib/operations/helpers')

const nonServiceCollections = getNonServiceCollections()
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
const configuration = module.context.service.configuration
const limit = configuration['skeleton-graph-update-batch-size']

// Sync Vertex Create Events
const unsyncedVertexCreates = query`
  for e in ${eventColl}
    filter e.event == 'created'
    filter parse_identifier(e.meta._id).collection in ${nonServiceCollections}
    let sv = (
      for s in ${skeletonVerticesColl}
        filter s.meta._id == e.meta._id
      return 1
    )
    filter length(sv) == 0
    collect node = e.meta into events = keep(e, 'event', 'ctime')
    sort length(events) desc
    limit ${limit}
  return {node, events}
`.toArray()

for (let v of unsyncedVertexCreates) {

}
