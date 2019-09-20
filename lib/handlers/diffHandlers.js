'use strict'

const diffOp = require('../operations/diff')
// noinspection NpmUsedModulesInstalled
const { omit } = require('lodash')

function diff (req) {
  const options = omit(req.queryParams, 'path')
  const path = req.queryParams.path || req.body.path

  return diffOp(path, options)
}

module.exports = {
  diff
}
