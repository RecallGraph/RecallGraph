'use strict'

const logOp = require('../operations/log')
const { omit } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { PATH_SCHEMA } = require('../routes/constants')

const optionsSchema = JoiRG.object().keys({
  since: JoiRG.number(),
  until: JoiRG.number(),
  sort: JoiRG.string().valid('asc', 'desc'),
  skip: JoiRG.number().integer().min(0),
  limit: JoiRG.number().integer().min(0),
  groupBy: JoiRG.string().valid('node', 'collection', 'event', 'type'),
  countsOnly: JoiRG.boolean(),
  groupSort: JoiRG.string().valid('asc', 'desc'),
  groupSkip: JoiRG.number().integer().min(0),
  groupLimit: JoiRG.number().integer().min(0),
  postFilter: JoiRG.string().filter()
})

function log (req) {
  const path = req.queryParams.path || req.body.path

  const options = omit(req.queryParams, 'path', 'postFilter')
  options.postFilter = req.queryParams.postFilter || (req.body && req.body.postFilter)

  return logOp(path, options)
}

function logProvider (path, options = {}) {
  const result = validate([path, options], [PATH_SCHEMA, optionsSchema])
  checkValidation(result)

  return logOp(...result.values)
}

module.exports = {
  log,
  logProvider
}
