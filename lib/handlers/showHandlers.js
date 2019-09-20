'use strict'

const showOp = require('../operations/show')
// noinspection NpmUsedModulesInstalled
const { omit } = require('lodash')

function show (req) {
  const options = omit(req.queryParams, 'path', 'timestamp')
  const path = req.queryParams.path || req.body.path
  const timestamp = req.queryParams.timestamp

  return showOp(path, timestamp, options)
}

module.exports = {
  show
}
