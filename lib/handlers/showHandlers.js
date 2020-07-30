'use strict'

const showOp = require('../operations/show')
const { omit } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { PATH_SCHEMA } = require('../routes/schemas')

const optionsSchema = JoiRG.object().keys({
  sort: JoiRG.string().valid('asc', 'desc'),
  skip: JoiRG.number().integer().min(0),
  limit: JoiRG.number().integer().min(0),
  groupBy: JoiRG.string().valid('collection', 'type'),
  countsOnly: JoiRG.boolean(),
  groupSort: JoiRG.string().valid('asc', 'desc'),
  groupSkip: JoiRG.number().integer().min(0),
  groupLimit: JoiRG.number().integer().min(0),
  postFilter: JoiRG.string().filter().empty('')
})

function show (req) {
  const path = req.queryParams.path || req.body.path
  const { timestamp } = req.queryParams

  const options = omit(req.queryParams, 'path', 'timestamp', 'postFilter')
  options.postFilter = req.queryParams.postFilter || (req.body && req.body.postFilter)

  return showOp(path, timestamp, options)
}

function showProvider (path, timestamp, options = {}) {
  const result = validate([path, timestamp, options], [PATH_SCHEMA, JoiRG.number(), optionsSchema])
  checkValidation(result)

  return showOp(...result.values)
}

module.exports = {
  show,
  showProvider
}
