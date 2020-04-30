'use strict'

const { parseExpr } = require('../helpers')
const { buildNodeIdGroupsByType, buildNodeGroupsByType } = require('../traverse/helpers')
const { getAllPaths, buildPaths, kShortestPaths } = require('./helpers')
const { time: dbtime } = require('@arangodb')
const { utils: { attachSpan } } = require('foxx-tracing')
const { getComponentTagOption } = require('../../helpers')

const cto = getComponentTagOption(__filename)
const kspFn = function kspFn (timestamp, svid, evid, depth = 1, k = 1, edgeCollections = {},
  { vFilter, eFilter, weightExpr = '1' } = {}) {
  timestamp = timestamp || dbtime()

  const paths = getAllPaths(timestamp, svid, evid, depth, edgeCollections)
  const types = {
    vertices: [],
    edges: []
  }

  for (const path of paths) {
    buildNodeIdGroupsByType(path, types)
  }

  const built = buildNodeGroupsByType(timestamp, types, vFilter, eFilter)
  const builtPaths = buildPaths(built, paths)
  const weightFn = parseExpr(weightExpr)

  return kShortestPaths(builtPaths, weightFn, k)
}

module.exports = attachSpan(kspFn, 'kShortestPaths', cto)
