'use strict'

const { db, errors: ARANGO_ERRORS } = require('@arangodb')
const gg = require('@arangodb/general-graph')
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../lib/helpers')

const { events, commands, snapshots, evtSSLinks, snapshotLinks, skeletonVertices, skeletonEdgeHubs, skeletonEdgeSpokes } = SERVICE_COLLECTIONS
const documentCollections = [events, snapshots, skeletonVertices, skeletonEdgeHubs]
const edgeCollections = [commands, evtSSLinks, snapshotLinks, skeletonEdgeSpokes]

for (const localName of documentCollections) {
  if (!db._collection(localName)) {
    db._createDocumentCollection(localName)
  } else { // noinspection JSUnresolvedVariable
    if (module.context.isProduction) {
      console.debug(
        `collection ${localName} already exists. Leaving it untouched.`
      )
    }
  }
}

for (const localName of edgeCollections) {
  if (!db._collection(localName)) {
    db._createEdgeCollection(localName)
  } else { // noinspection JSUnresolvedVariable
    if (module.context.isProduction) {
      console.debug(
        `collection ${localName} already exists. Leaving it untouched.`
      )
    }
  }
}

const eventColl = db._collection(events)
eventColl.ensureIndex({
  type: 'hash',
  sparse: true,
  unique: false,
  deduplicate: false,
  fields: ['meta.id', 'event', 'ctime']
})
eventColl.ensureIndex({
  type: 'hash',
  sparse: true,
  unique: false,
  deduplicate: false,
  fields: ['collection']
})
eventColl.ensureIndex({
  type: 'skiplist',
  sparse: true,
  unique: false,
  deduplicate: false,
  fields: ['ctime']
})
eventColl.ensureIndex({
  type: 'skiplist',
  sparse: true,
  unique: false,
  deduplicate: false,
  fields: ['hops-from-origin']
})

const commandColl = db._collection(commands)
commandColl.ensureIndex({
  type: 'hash',
  sparse: true,
  unique: true,
  deduplicate: false,
  fields: ['_from', 'meta.id']
})

const skeletonEdgeSpokesColl = db._collection(skeletonEdgeSpokes)
skeletonEdgeSpokesColl.ensureIndex({
  type: 'hash',
  sparse: false,
  unique: false,
  deduplicate: false,
  fields: ['hub']
})

const { eventLog, skeleton } = SERVICE_GRAPHS
let evlEdgeDefs, skelEdgeDefs

try {
  const commandRel = gg._relation(commands, [events], [events])
  const ssRel = gg._relation(snapshotLinks, [snapshots], [snapshots])
  const evtSSRel = gg._relation(evtSSLinks, [events], [snapshots])
  evlEdgeDefs = gg._edgeDefinitions(commandRel, ssRel, evtSSRel)

  gg._drop(eventLog)
} catch (e) {
  if (e.errorNum !== ARANGO_ERRORS.ERROR_GRAPH_NOT_FOUND.code) {
    console.error(e)
  }
} finally {
  gg._create(eventLog, evlEdgeDefs)
}

try {
  const skeletonRel = gg._relation(skeletonEdgeSpokes, [skeletonVertices, skeletonEdgeHubs], [
    skeletonVertices,
    skeletonEdgeHubs
  ])
  skelEdgeDefs = gg._edgeDefinitions(skeletonRel)

  gg._drop(skeleton)
} catch (e) {
  if (e.errorNum !== ARANGO_ERRORS.ERROR_GRAPH_NOT_FOUND.code) {
    console.error(e)
  }
} finally {
  gg._create(skeleton, skelEdgeDefs)
}

console.log('Finished setup.')
