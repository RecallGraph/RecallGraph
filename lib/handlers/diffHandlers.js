'use strict'

const diffOp = require('../operations/diff')
const { omit } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { PATH_SCHEMA } = require('../routes/constants')

const optionsSchema = JoiRG.object().keys({
  since: JoiRG.number(),
  until: JoiRG.number(),
  sort: JoiRG.string().valid('asc', 'desc'),
  skip: JoiRG.number().integer().min(0),
  limit: JoiRG.number().integer().min(0),
  reverse: JoiRG.boolean(),
  postFilter: JoiRG.string().filter().empty('')
})
const providerSchemas = [PATH_SCHEMA, optionsSchema]

function diff (req) {
  const path = req.queryParams.path || req.body.path

  const options = omit(req.queryParams, 'path', 'postFilter')
  options.postFilter = req.queryParams.postFilter || (req.body && req.body.postFilter)

  return diffOp(path, options)
}

function diffProvider (path, options = {}) {
  const result = validate([path, options], providerSchemas)
  checkValidation(result)

  return diffOp(...result.values)
}

module.exports = {
  diff,
  diffProvider
}
