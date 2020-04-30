'use strict'

const {
  traverseSkeletonGraph, buildFilteredGraph, buildNodeIdGroupsByType, buildNodeGroupsByType
} = require('./helpers')
const { time: dbtime } = require('@arangodb')
const { utils: { attachSpan } } = require('foxx-tracing')
const { getComponentTagOption } = require('../../helpers')

const cto = getComponentTagOption(__filename)
const traverseFn = function traverse (timestamp, svid, depth = 1, edgeCollections = {},
  { bfs = false, uniqueVertices = 'none', uniqueEdges = 'path', vFilter, eFilter } = {}) {
  timestamp = timestamp || dbtime()

  let traversal

  const path = traverseSkeletonGraph(timestamp, svid, depth, edgeCollections, { bfs, uniqueVertices, uniqueEdges })
  const types = buildNodeIdGroupsByType(path)

  if (types.vertices.length) {
    const built = buildNodeGroupsByType(timestamp, types, vFilter, eFilter)
    traversal = buildFilteredGraph(svid, built.vertices, built.edges)
  } else {
    traversal = { vertices: [], edges: [] }
  }

  return traversal
}

module.exports = attachSpan(traverseFn, 'traverse', cto)
