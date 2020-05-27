'use strict'

const { chain } = require('lodash')
const Joi = require('joi')
const { makeRe } = require('minimatch')
const {
  getDBScope, getGraphScope, getCollectionScope, getNodeGlobScope, getNodeBraceScope
} = require('./operations/helpers')

const docKeyPattern = '[a-zA-Z0-9-_:.@()+,=;$!*\'%]+'
const collnamePattern = '[a-zA-Z0-9-_]+'

// Public
const DOC_KEY_REGEX = new RegExp('^' + docKeyPattern + '$')
const DOC_ID_REGEX = new RegExp('^' + collnamePattern + '\\/' + docKeyPattern + '$')
const COLL_NAME_REGEX = new RegExp('^' + collnamePattern + '$')

// Private
const updateObjSchema = Joi.object().keys({
  _key: Joi.string().regex(DOC_KEY_REGEX).required(),
  _id: Joi.string().regex(DOC_ID_REGEX).required(),
  _from: Joi.string().regex(DOC_ID_REGEX).required(),
  _to: Joi.string().regex(DOC_ID_REGEX).required()
}).unknown(true).or('_key', '_id').optionalKeys('_from', '_to', '_key', '_id')
const updateArrSchema = Joi.array().items(updateObjSchema.required()).min(1)
const dbSchema = Joi.string().regex(makeRe(getDBScope().pathPattern))
const graphSchema = Joi.string().regex(makeRe(getGraphScope().pathPattern))
const collSchema = Joi.string().regex(makeRe(getCollectionScope().pathPattern))
const nodeGlobSchema = Joi.string().regex(makeRe(getNodeGlobScope().pathPattern))
const nodeBraceSchema = Joi.string().regex(makeRe(getNodeBraceScope().pathPattern))

// Public
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

const UPDATE_BODY_SCHEMA = Joi.alternatives().try(updateObjSchema, updateArrSchema).required()

const PATH_SCHEMA = Joi.alternatives()
  .try(dbSchema, graphSchema, collSchema, nodeGlobSchema, nodeBraceSchema)
  .required()

const TYPE_SCHEMA = Joi.array()
  .items(Joi.string().valid(SYNC_TYPES.EXISTING, SYNC_TYPES.DELETED))
  .min(1)
  .max(2)
  .unique()
  .required()

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
  TRANSIENT_EVENT_SUPERNODE,
  COLLECTION_TYPES,
  COLL_TYPES_REF,
  SORT_TYPES,
  SYNC_TYPES,
  UPDATE_BODY_SCHEMA,
  PATH_SCHEMA,
  TYPE_SCHEMA,
  VERBOSITY
}
