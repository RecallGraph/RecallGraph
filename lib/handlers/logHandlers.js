'use strict'

const logOp = require('../operations/log')
const { omit } = require('lodash')

function log (req) {
  const path = req.queryParams.path || req.body.path

  const options = omit(req.queryParams, 'path', 'postFilter')
  options.postFilter = req.queryParams.postFilter || (req.body && req.body.postFilter)

  return logOp(path, options)
}

function logProvider (path, options = {}) {
  const req = {
    body: path,
    queryParams: options
  }

  return log(req)
}

module.exports = {
  log,
  logProvider
}
