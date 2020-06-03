'use strict'

const kspOp = require('../operations/k_shortest_paths')

function kShortestPaths (req) {
  const { edges: edgeCollections, vFilter, eFilter, weightExpr } = req.body
  const { timestamp, svid, evid, depth, skip, limit } = req.queryParams

  return kspOp(timestamp, svid, evid, depth, edgeCollections, skip, limit, { vFilter, eFilter, weightExpr })
}

function kspProvider (timestamp, svid, evid, depth, edges, skip = 0, limit = 1,
  { vFilter, eFilter, weightExpr } = {}) {
  const req = {
    body: { edges, vFilter, eFilter, weightExpr },
    queryParams: { timestamp, svid, evid, depth, skip, limit }
  }

  return kspOp(req)
}

module.exports = {
  kShortestPaths,
  kspProvider
}
