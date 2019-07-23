'use strict'
const { db, errors: ARANGO_ERRORS } = require('@arangodb')
const gg = require('@arangodb/general-graph')
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../lib/helpers')

const { events, commands, snapshots, evtSSLinks, skeletonVertices, skeletonEdges } = SERVICE_COLLECTIONS
const documentCollections = [events, snapshots, skeletonVertices]
const edgeCollections = [commands, evtSSLinks, skeletonEdges]

for (const localName of documentCollections) {
  if (!db._collection(localName)) {
    db._createDocumentCollection(localName)
  } else if (module.context.isProduction) {
    console.debug(
      `collection ${localName} already exists. Leaving it untouched.`
    )
  }
}

for (const localName of edgeCollections) {
  if (!db._collection(localName)) {
    db._createEdgeCollection(localName)
  } else if (module.context.isProduction) {
    console.debug(
      `collection ${localName} already exists. Leaving it untouched.`
    )
  }
}

const eventColl = db._collection(events)
eventColl.ensureIndex({
  type: 'hash',
  sparse: true,
  unique: false,
  deduplicate: false,
  fields: ['meta._id', 'event', 'ctime']
})
eventColl.ensureIndex({
  type: 'skiplist',
  sparse: true,
  unique: false,
  deduplicate: false,
  fields: ['ctime']
})

const commandColl = db._collection(commands)
commandColl.ensureIndex({
  type: 'hash',
  sparse: true,
  unique: true,
  deduplicate: false,
  fields: ['_from', 'meta._id']
})

const skeletonVerticesColl = db._collection(skeletonVertices)
skeletonVerticesColl.ensureIndex({
  type: 'hash',
  sparse: false,
  unique: true,
  deduplicate: false,
  fields: ['meta._id']
})

const skeletonEdgesColl = db._collection(skeletonEdges)
skeletonEdgesColl.ensureIndex({
  type: 'hash',
  sparse: false,
  unique: true,
  deduplicate: false,
  fields: ['meta._id']
})

const { eventLog, skeleton } = SERVICE_GRAPHS
let evlEdgeDefs, skelEdgeDefs
try {
  const commandRel = gg._relation(commands, [events], [events])
  const ssRel = gg._relation(evtSSLinks, [events], [snapshots])
  evlEdgeDefs = gg._edgeDefinitions(commandRel, ssRel)

  gg._drop(eventLog)

  const skeletonRel = gg._relation(skeletonEdges, [skeletonVertices], [skeletonVertices])
  skelEdgeDefs = gg._edgeDefinitions(skeletonRel)

  gg._drop(skeleton)
} catch (e) {
  if (e.errorNum !== ARANGO_ERRORS.ERROR_GRAPH_NOT_FOUND.code) {
    console.error(e)
  }
} finally {
  gg._create(eventLog, evlEdgeDefs)
  gg._create(skeleton, skelEdgeDefs)
}
