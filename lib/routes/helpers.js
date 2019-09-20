'use strict'

// noinspection NpmUsedModulesInstalled
const { chain } = require('lodash')
// noinspection NpmUsedModulesInstalled
const joi = require('joi')
// noinspection NpmUsedModulesInstalled
const { makeRe } = require('minimatch')
const {
  getDBScope,
  getGraphScope,
  getCollectionScope,
  getNodeGlobScope,
  getNodeBraceScope
} = require('../operations/helpers')

const dbSchema = joi.string().regex(makeRe(getDBScope().pathPattern))
const graphSchema = joi.string().regex(makeRe(getGraphScope().pathPattern))
const collSchema = joi.string().regex(makeRe(getCollectionScope().pathPattern))
const nodeGlobSchema = joi
  .string()
  .regex(makeRe(getNodeGlobScope().pathPattern))
const nodeBraceSchema = joi
  .string()
  .regex(makeRe(getNodeBraceScope().pathPattern))

exports.pathSchema = joi
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
