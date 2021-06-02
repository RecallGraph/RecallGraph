'use strict'

const { parseExpr } = require('../helpers')
const { buildNodeIdGroupsByType, buildNodeGroupsByType } = require('../traverse/helpers')
const { getAllPaths, buildPaths, kShortestPaths } = require('./helpers')
const { time: dbtime } = require('@arangodb')
const { utils: { attachSpan } } = require('@recallgraph/foxx-tracer')
const { getComponentTagOption } = require('../../helpers')

const cto = getComponentTagOption(__filename)

function ksp (timestamp, svid, evid, depth = 1, edges, skip = 0, limit = 1,
  { vFilter, eFilter, weightExpr = '1' } = {}) {
  timestamp = timestamp || dbtime()

  const paths = getAllPaths(timestamp, svid, evid, depth, edges)
  const types = {
    vertices: [],
    edges: []
  }

  buildNodeIdGroupsByType(paths, types)

  const built = buildNodeGroupsByType(timestamp, types, vFilter, eFilter)
  const builtPaths = buildPaths(built, paths)
  const weightFn = parseExpr(weightExpr)

  return kShortestPaths(builtPaths, weightFn, skip, limit)
}

module.exports = attachSpan(ksp, 'kShortestPaths', cto)
