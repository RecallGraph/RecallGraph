'use strict'

const diffOp = require('../operations/diff')
const { omit } = require('lodash')

function diff (req) {
  const path = req.queryParams.path || req.body.path

  const options = omit(req.queryParams, 'path', 'postFilter')
  options.postFilter = req.queryParams.postFilter || (req.body && req.body.postFilter)

  return diffOp(path, options)
}

function diffProvider (path, options = {}) {
  const req = {
    queryParams: options,
    body: path
  }

  return diff(req)
}

module.exports = {
  diff,
  diffProvider
}
