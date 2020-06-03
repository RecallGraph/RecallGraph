'use strict'

const showOp = require('../operations/show')
const { omit } = require('lodash')

function show (req) {
  const path = req.queryParams.path || req.body.path
  const { timestamp } = req.queryParams

  const options = omit(req.queryParams, 'path', 'timestamp', 'postFilter')
  options.postFilter = req.queryParams.postFilter || (req.body && req.body.postFilter)

  return showOp(path, timestamp, options)
}

function showProvider (path, timestamp, options = {}) {
  const req = {
    body: path,
    queryParams: Object.assign({ timestamp }, options)
  }

  return show(req)
}

module.exports = {
  show,
  showProvider
}
