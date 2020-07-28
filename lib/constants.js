'use strict'

const { chain } = require('lodash')

// Private
const docKeyPattern = '[a-zA-Z0-9-_:.@()+,=;$!*\'%]+'
const collnamePattern = '[a-zA-Z0-9-_]+'

// Public
const DOC_KEY_REGEX = new RegExp('^' + docKeyPattern + '$')
const DOC_ID_REGEX = new RegExp('^' + collnamePattern + '\\/' + docKeyPattern + '$')
const COLL_NAME_REGEX = new RegExp('^' + collnamePattern + '$')

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

const SERVICE_GRAPHS = Object.freeze({
  eventLog: `${module.context.collectionPrefix}event_log`,
  skeleton: `${module.context.collectionPrefix}skeleton`
})

const DB_OPS = Object.freeze({
  INSERT: 'insert',
  REPLACE: 'replace',
  REMOVE: 'remove',
  UPDATE: 'update',
  RESTORE: 'restore'
})

const EVENTS = Object.freeze({
  INIT: 'init',
  COLL_INIT: 'collInit',
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  RESTORED: 'restored'
})

const TRANSIENT_EVENT_SUPERNODE = Object.freeze({
  _id: `${SERVICE_COLLECTIONS.events}/origin`,
  _key: 'origin',
  'is-super-origin-node': true,
  event: EVENTS.INIT,
  collection: SERVICE_COLLECTIONS.events,
  meta: {
    id: `${SERVICE_COLLECTIONS.events}/origin`
  },
  'hops-from-origin': -1
})

const COLLECTION_TYPES = Object.freeze({
  VERTEX: 2,
  EDGE: 3
})

const COLL_TYPES_REF = Object.freeze(chain(COLLECTION_TYPES)
  .map((idx, label) => [idx, label.toLowerCase()])
  .fromPairs()
  .value())

const SORT_TYPES = Object.freeze({
  ASC: 'asc',
  DESC: 'desc'
})

const SYNC_TYPES = Object.freeze({
  EXISTING: 'existing',
  DELETED: 'deleted'
})

const VERBOSITY = {
  SILENT: 0,
  STATS: 1,
  META: 2,
  DATA: 3
}

module.exports = {
  SERVICE_COLLECTIONS,
  COLL_NAME_REGEX,
  DOC_KEY_REGEX,
  DOC_ID_REGEX,
  SERVICE_GRAPHS,
  DB_OPS,
  EVENTS,
  TRANSIENT_EVENT_SUPERNODE,
  COLLECTION_TYPES,
  COLL_TYPES_REF,
  SORT_TYPES,
  SYNC_TYPES,
  VERBOSITY
}
