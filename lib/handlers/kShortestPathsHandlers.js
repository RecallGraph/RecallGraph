'use strict'

const kspOp = require('../operations/k_shortest_paths')

function kShortestPaths (req) {
  const { edges: edgeCollections, vFilter, eFilter, weightExpr } = req.body
  const { timestamp, svid, evid, depth, skip, limit } = req.queryParams

  return kspOp(timestamp, svid, evid, depth, skip, limit, edgeCollections, { vFilter, eFilter, weightExpr })
}

module.exports = {
  kShortestPaths
}
