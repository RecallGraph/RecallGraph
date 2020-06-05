'use strict'

const { JoiRG } = require('./helpers')
const { makeRe } = require('minimatch')
const {
  getDBScope, getGraphScope, getCollectionScope, getNodeGlobScope, getNodeBraceScope
} = require('../operations/helpers')
const { DOC_KEY_REGEX, DOC_ID_REGEX, SYNC_TYPES: { EXISTING, DELETED } } = require('../constants')

// Private
const createObjSchema = JoiRG.object().keys({
  _from: JoiRG.string().regex(DOC_ID_REGEX).required(),
  _to: JoiRG.string().regex(DOC_ID_REGEX).required()
}).unknown(true).optionalKeys('_from', '_to').with('_from', '_to').with('_to', '_from')
const createArrSchema = JoiRG.array().items(createObjSchema.required()).min(1)

const updateObjSchema = JoiRG.object().keys({
  _key: JoiRG.string().regex(DOC_KEY_REGEX).required(),
  _id: JoiRG.string().regex(DOC_ID_REGEX).required(),
  _from: JoiRG.string().regex(DOC_ID_REGEX).required(),
  _to: JoiRG.string().regex(DOC_ID_REGEX).required()
}).unknown(true).or('_key', '_id').optionalKeys('_from', '_to', '_key', '_id')
const updateArrSchema = JoiRG.array().items(updateObjSchema.required()).min(1)

const removeObjSchema = JoiRG.object().keys({
  _key: JoiRG.string().regex(DOC_KEY_REGEX).required(),
  _id: JoiRG.string().regex(DOC_ID_REGEX).required()
})
  .unknown(true).or('_key', '_id').optionalKeys('_key', '_id')
const removeArrSchema = JoiRG.array().items(removeObjSchema.required()).min(1)

const dbSchema = JoiRG.string().regex(makeRe(getDBScope().pathPattern))
const graphSchema = JoiRG.string().regex(makeRe(getGraphScope().pathPattern))
const collSchema = JoiRG.string().regex(makeRe(getCollectionScope().pathPattern))
const nodeGlobSchema = JoiRG.string().regex(makeRe(getNodeGlobScope().pathPattern))
const nodeBraceSchema = JoiRG.string().regex(makeRe(getNodeBraceScope().pathPattern))

// Public
const CREATE_BODY_SCHEMA = JoiRG.alternatives().try(createObjSchema, createArrSchema).required()
const UPDATE_BODY_SCHEMA = JoiRG.alternatives().try(updateObjSchema, updateArrSchema).required()
const REMOVE_BODY_SCHEMA = JoiRG.alternatives().try(removeObjSchema, removeArrSchema).required()
const TRAVERSE_BODY_SCHEMA = JoiRG.object().keys({
  edges: JoiRG.object().pattern(/^/, JoiRG.string().valid('inbound', 'outbound', 'any')).min(1).required(),
  vFilter: JoiRG.string().filter().empty(''),
  eFilter: JoiRG.string().filter().empty(''),
  pFilter: JoiRG.string().filter().empty('')
})

const PATH_SCHEMA = JoiRG.alternatives()
  .try(dbSchema, graphSchema, collSchema, nodeGlobSchema, nodeBraceSchema)
  .required()

const TYPE_SCHEMA = JoiRG.array()
  .items(JoiRG.string().valid(EXISTING, DELETED))
  .min(1)
  .max(2)
  .unique()

const KSP_REQ_BODY_SCHEMA = JoiRG.object().keys({
  edges: JoiRG.object().pattern(/^/, JoiRG.string().valid('inbound', 'outbound', 'any')).min(1).required(),
  vFilter: JoiRG.string().filter().empty(''),
  eFilter: JoiRG.string().filter().empty(''),
  weightExpr: JoiRG.string().filter().empty('')
})

module.exports = {
  CREATE_BODY_SCHEMA,
  UPDATE_BODY_SCHEMA,
  REMOVE_BODY_SCHEMA,
  TRAVERSE_BODY_SCHEMA,
  PATH_SCHEMA,
  TYPE_SCHEMA,
  KSP_REQ_BODY_SCHEMA
}
