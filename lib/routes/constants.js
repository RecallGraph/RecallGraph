'use strict'

const Joi = require('joi')
const { makeRe } = require('minimatch')
const {
  getDBScope, getGraphScope, getCollectionScope, getNodeGlobScope, getNodeBraceScope
} = require('../operations/helpers')
const { DOC_KEY_REGEX, DOC_ID_REGEX, SYNC_TYPES: { EXISTING, DELETED } } = require('../constants')

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
const UPDATE_BODY_SCHEMA = Joi.alternatives().try(updateObjSchema, updateArrSchema).required()

const PATH_SCHEMA = Joi.alternatives()
  .try(dbSchema, graphSchema, collSchema, nodeGlobSchema, nodeBraceSchema)
  .required()

const TYPE_SCHEMA = Joi.array()
  .items(Joi.string().valid(EXISTING, DELETED))
  .min(1)
  .max(2)
  .unique()

module.exports = {
  UPDATE_BODY_SCHEMA,
  PATH_SCHEMA,
  TYPE_SCHEMA
}
