'use strict'

const { memoize } = require('lodash')
const { db } = require('@arangodb')
const { parse, relative, join } = require('path')
const { Tags: { COMPONENT } } = require('opentracing')

const LIB_ROOT = join(module.context.basePath, 'lib')

const SERVICE_COLLECTIONS = Object.freeze({
  events: module.context.collectionName('_events'),
  commands: module.context.collectionName('_commands'),
  snapshots: module.context.collectionName('_snapshots'),
  evtSSLinks: module.context.collectionName('_event_snapshot_links'),
  snapshotLinks: module.context.collectionName('_snapshot_links'),
  skeletonVertices: module.context.collectionName('_skeleton_vertices'),
  skeletonEdgeHubs: module.context.collectionName('_skeleton_edge_hubs'),
  skeletonEdgeSpokes: module.context.collectionName('_skeleton_edge_spokes')
})
exports.SERVICE_COLLECTIONS = SERVICE_COLLECTIONS

const DOC_KEY_PATTERN = '[a-zA-Z0-9-_:.@()+,=;$!*\'%]+'
const COLL_NAME_PATTERN = '[a-zA-Z0-9-_]+'
exports.COLL_NAME_REGEX = new RegExp('^' + COLL_NAME_PATTERN + '$')
exports.DOC_KEY_REGEX = new RegExp('^' + DOC_KEY_PATTERN + '$')
exports.DOC_ID_REGEX = new RegExp('^' + COLL_NAME_PATTERN + '\\/' + DOC_KEY_PATTERN + '$'
)

exports.SERVICE_GRAPHS = Object.freeze({
  eventLog: `${module.context.collectionPrefix}event_log`,
  skeleton: `${module.context.collectionPrefix}skeleton`
})

exports.DB_OPS = Object.freeze({
  INSERT: 'insert',
  REPLACE: 'replace',
  REMOVE: 'remove',
  UPDATE: 'update',
  RESTORE: 'restore'
})

exports.PATCH_TYPES = Object.freeze({
  NONE: 'none',
  FORWARD: 'forward',
  REVERSE: 'reverse'
})

exports.snapshotInterval = function snapshotInterval (collName) {
  const snapshotIntervals = module.context.configuration['snapshot-intervals']
  const interval = parseInt(snapshotIntervals[collName])

  return Number.isInteger(interval) ? interval : parseInt(snapshotIntervals._default)
}

const TRANSIENT_EVENT_SUPERNODE = Object.freeze({
  _id: `${SERVICE_COLLECTIONS.events}/origin`,
  _key: 'origin',
  'is-super-origin-node': true,
  event: 'init',
  collection: SERVICE_COLLECTIONS.events,
  meta: {
    id: `${SERVICE_COLLECTIONS.events}/origin`
  },
  'hops-from-origin': -1
})
exports.TRANSIENT_EVENT_SUPERNODE = TRANSIENT_EVENT_SUPERNODE

const COLLECTION_TYPES = Object.freeze({
  VERTEX: 2,
  EDGE: 3
})
exports.COLLECTION_TYPES = COLLECTION_TYPES

exports.getCollectionType = memoize((collName) => db._collection(collName).type())

exports.getComponentTagOption = function getComponent (filePath) {
  const relPath = relative(LIB_ROOT, filePath)
  const components = parse(relPath)

  return {
    tags: {
      [COMPONENT]: join(components.dir, components.name)
    }
  }
}
