'use strict'

const traverseOp = require('../operations/traverse')

const { omit } = require('lodash')

function traverse (req) {
  const options = omit(req.queryParams, 'timestamp', 'svid', 'depth')
  const { edges: edgeCollections, vFilter, eFilter } = req.body
  const { timestamp, svid, depth } = req.queryParams

  return traverseOp(timestamp, svid, depth, edgeCollections, Object.assign({ vFilter, eFilter }, options))
}

module.exports = {
  traverse
}
