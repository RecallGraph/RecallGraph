'use strict'

const { chain } = require('lodash')
const { getAST } = require('../operations/helpers')
const Joi = require('joi')

const { makeRe } = require('minimatch')
const {
  getDBScope,
  getGraphScope,
  getCollectionScope,
  getNodeGlobScope,
  getNodeBraceScope
} = require('../operations/helpers')

const dbSchema = Joi.string().regex(makeRe(getDBScope().pathPattern))
const graphSchema = Joi.string().regex(makeRe(getGraphScope().pathPattern))
const collSchema = Joi.string().regex(makeRe(getCollectionScope().pathPattern))
const nodeGlobSchema = Joi
  .string()
  .regex(makeRe(getNodeGlobScope().pathPattern))
const nodeBraceSchema = Joi
  .string()
  .regex(makeRe(getNodeBraceScope().pathPattern))

exports.pathSchema = Joi
  .alternatives()
  .try(dbSchema, graphSchema, collSchema, nodeGlobSchema, nodeBraceSchema)
  .required()

exports.getCRUDErrors = function getCRUDErrors (result) {
  return chain(result)
    .map('errorNum')
    .compact()
    .countBy()
    .map((val, key) => `${key}:${val}`)
    .join()
    .value()
}

exports.joiCG = Joi.extend(joi => ({
  base: joi.string(),
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
