'use strict'

const { memoize } = require('lodash')
const queues = require('@arangodb/foxx/queues')
const { db } = require('@arangodb')

const configuration = module.context.service.configuration
const SERVICE_COLLECTIONS = Object.freeze({
  events: module.context.collectionName(
    configuration['event-coll-suffix']),
  commands: module.context.collectionName(
    configuration['command-coll-suffix']),
  snapshots: module.context.collectionName(
    configuration['snapshot-coll-suffix']
  ),
  evtSSLinks: module.context.collectionName(
    configuration['event-snapshot-link-coll-suffix']
  ),
  snapshotLinks: module.context.collectionName(
    configuration['snapshot-link-coll-suffix']
  ),
  skeletonVertices: module.context.collectionName(
    configuration['skeleton-vertex-coll-suffix']
  ),
  skeletonEdgeHubs: module.context.collectionName(
    configuration['skeleton-edge-hub-coll-suffix']
  ),
  skeletonEdgeSpokes: module.context.collectionName(
    configuration['skeleton-edge-spoke-coll-suffix']
  )
})
exports.SERVICE_COLLECTIONS = SERVICE_COLLECTIONS

const DOC_KEY_PATTERN = '[a-zA-Z0-9-_:.@()+,=;$!*\'%]+'
const COLL_NAME_PATTERN = '[a-zA-Z0-9-_]+'
exports.COLL_NAME_REGEX = new RegExp('^' + COLL_NAME_PATTERN + '$')
exports.DOC_KEY_REGEX = new RegExp('^' + DOC_KEY_PATTERN + '$')
exports.DOC_ID_REGEX = new RegExp(
  '^' + COLL_NAME_PATTERN + '\\/' + DOC_KEY_PATTERN + '$'
)

exports.SERVICE_GRAPHS = Object.freeze({
  eventLog: `${module.context.collectionPrefix}event_log`,
  skeleton: `${module.context.collectionPrefix}skeleton`
})

exports.DB_OPS = Object.freeze({
  INSERT: 'insert',
  REPLACE: 'replace',
  REMOVE: 'remove',
  UPDATE: 'update'
})

exports.PATCH_TYPES = Object.freeze({
  NONE: 'none',
  FORWARD: 'forward',
  REVERSE: 'reverse'
})

exports.snapshotInterval = function snapshotInterval (collName) {
  const snapshotIntervals = configuration['snapshot-intervals']
  const interval = parseInt(snapshotIntervals[collName])

  return Number.isInteger(interval)
    ? interval
    : parseInt(snapshotIntervals._default)
}

const TRANSIENT_EVENT_SUPERNODE = Object.freeze({
  _id: `${SERVICE_COLLECTIONS.events}/origin`,
  _key: 'origin',
  'is-super-origin-node': true
})
exports.TRANSIENT_EVENT_SUPERNODE = TRANSIENT_EVENT_SUPERNODE

const COLLECTION_TYPES = Object.freeze({
  VERTEX: 2,
  EDGE: 3
})
exports.COLLECTION_TYPES = COLLECTION_TYPES

exports.getCollectionType = memoize((collName) => db._collection(collName).type())

exports.createSkeletonUpdateCron = function createSkeletonUpdateCron () {
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
    },
    repeatDelay: 1000
  })
}

exports.deleteSkeletonUpdateCron = function deleteSkeletonUpdateCron () {
  try {
    const queue = queues.get('crons')
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

    queues.delete('crons')
  } catch (e) {
    console.error(e)
  }
}
