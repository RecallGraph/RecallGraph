'use strict'

const traverseOp = require('../operations/traverse')
const { omit, pick } = require('lodash')

function traverse (req) {
  const options = omit(req.queryParams, 'timestamp', 'svid', 'minDepth', 'maxDepth')
  const { edges: edgeCollections, vFilter, eFilter, pFilter } = req.body
  const { timestamp, svid, minDepth, maxDepth } = req.queryParams

  return traverseOp(timestamp, svid, minDepth, maxDepth, edgeCollections,
    Object.assign({ vFilter, eFilter, pFilter }, options))
}

function traverseProvider (timestamp, svid, minDepth, maxDepth, edges, options = {}) {
  const req = {
    body: Object.assign({ edges }, pick(options, 'vFilter', 'eFilter', 'pFilter')),
    queryParams: Object.assign({ timestamp, svid, minDepth, maxDepth }, omit(options, 'vFilter', 'eFilter', 'pFilter'))
  }

  return traverse(req)
}

module.exports = {
  traverse,
  traverseProvider
}
