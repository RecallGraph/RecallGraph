'use strict'

const { chain } = require('lodash')
const { getAST } = require('../operations/helpers')
const Joi = require('joi')
const { makeRe } = require('minimatch')
const {
  getDBScope, getGraphScope, getCollectionScope, getNodeGlobScope, getNodeBraceScope
} = require('../operations/helpers')
const { DOC_ID_REGEX, DOC_KEY_REGEX } = require('../helpers')

const updateObjSchema = Joi.object().keys({
  _key: Joi.string().regex(DOC_KEY_REGEX).required(),
  _id: Joi.string().regex(DOC_ID_REGEX).required(),
  _from: Joi.string().regex(DOC_ID_REGEX).required(),
  _to: Joi.string().regex(DOC_ID_REGEX).required()
}).unknown(true).or('_key', '_id').optionalKeys('_from', '_to', '_key', '_id').with('_from', '_to').with('_to', '_from')
const updateArrSchema = Joi.array().items(updateObjSchema.required()).min(1)
const dbSchema = Joi.string().regex(makeRe(getDBScope().pathPattern))
const graphSchema = Joi.string().regex(makeRe(getGraphScope().pathPattern))
const collSchema = Joi.string().regex(makeRe(getCollectionScope().pathPattern))
const nodeGlobSchema = Joi.string().regex(makeRe(getNodeGlobScope().pathPattern))
const nodeBraceSchema = Joi.string().regex(makeRe(getNodeBraceScope().pathPattern))

// Public
const updateBodySchema = Joi.alternatives().try(updateObjSchema, updateArrSchema).required()
const pathSchema = Joi.alternatives().try(dbSchema, graphSchema, collSchema, nodeGlobSchema, nodeBraceSchema).required()

const getCRUDErrors = function getCRUDErrors (result) {
  return chain(result).map('errorNum').compact().countBy().map((val, key) => `${key}:${val}`).join().value()
}

const joiCG = Joi.extend(Joi => ({
  base: Joi.string(),
  name: 'string',
  language: {
    filter: 'must be a valid filter expression (see docs).'
  },
  rules: [
    {
      name: 'filter',
      validate (params, value, state, options) {
        try {
          getAST(value)

          return value
        } catch (e) {
          return this.createError('string.filter', { v: value }, state, options)
        }
      }
    }
  ]
}))

module.exports = {
  updateBodySchema,
  pathSchema,
  getCRUDErrors,
  joiCG
}
