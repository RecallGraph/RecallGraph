'use strict'

const traverseOp = require('../operations/traverse')
const { omit } = require('lodash')

function traverse (req) {
  const options = omit(req.queryParams, 'timestamp', 'svid', 'minDepth', 'maxDepth')
  const { edges: edgeCollections, vFilter, eFilter, pFilter } = req.body
  const { timestamp, svid, minDepth, maxDepth } = req.queryParams

  return traverseOp(timestamp, svid, minDepth, maxDepth, edgeCollections,
    Object.assign({ vFilter, eFilter, pFilter }, options))
}

module.exports = {
  traverse
}
