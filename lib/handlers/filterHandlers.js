'use strict'

const filterOp = require('../operations/filter')

const { omit } = require('lodash')

function filter (req) {
  const options = omit(req.queryParams, 'timestamp')
  const { path, filter: filterExpr } = req.body
  const timestamp = req.queryParams.timestamp

  return filterOp(path, timestamp, filterExpr, options)
}

module.exports = {
  filter
}
