'use strict'

const { db, errors: ARANGO_ERRORS } = require('@arangodb')

const gg = require('@arangodb/general-graph')

// const queues = require('@arangodb/foxx/queues')
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
  fields: ['meta._id', 'event', 'ctime']
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

const skeletonEdgeHubsColl = db._collection(skeletonEdgeHubs)
skeletonEdgeHubsColl.ensureIndex({
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
  const ssRel = gg._relation(snapshotLinks, [snapshots], [snapshots])
  const evtSSRel = gg._relation(evtSSLinks, [events], [snapshots])
  evlEdgeDefs = gg._edgeDefinitions(commandRel, ssRel, evtSSRel)

  gg._drop(eventLog)

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
  gg._create(eventLog, evlEdgeDefs)
  gg._create(skeleton, skelEdgeDefs)
}

/*
// Setup crons
const queue = queues.create('crons', 1)
// noinspection JSUnresolvedVariable
const mount = module.context.mount
const cronJob = 'updateSkeletonGraph'

 const stored = queue.all({
 name: cronJob,
 mount
})

 stored.forEach(jobId => {
 const job = queue.get(jobId)

 console.log('Deleting stored job: %o', job)
 queue.delete(jobId)
})

 // noinspection JSUnusedGlobalSymbols
queue.push({
 mount,
 name: cronJob
}, null, {
 maxFailures: Infinity,
 repeatTimes: Infinity,
 failure: (result, jobData, job) => console.error(`Failed job: ${JSON.stringify({
 result,
 job: [
 job.queue,
 job.type,
 job.failures,
 job.runs,
 job.runFailures
 ]
 })}`),
 success: (result, jobData,
 job) => {
 if (Object.keys(result).some(key => result[key].length)) {
 console.debug(`Passed job: ${JSON.stringify({
 result,
 job: [job.queue, job.type, job.runs, job.runFailures]
 })}`)
 }
 }
})
 */

console.log('Finished setup.')
