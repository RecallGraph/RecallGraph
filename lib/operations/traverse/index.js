'use strict'

const {
  traverseSkeletonGraph, buildFilteredGraph, buildNodeIdGroupsByType, buildNodeGroupsByType
} = require('./helpers')
const { time: dbtime } = require('@arangodb')
const { utils: { attachSpan } } = require('foxx-tracing')
const { getComponentTagOption } = require('../../helpers')
const { pickBy } = require('lodash')

const cto = getComponentTagOption(__filename)
function traverse (timestamp, svid, minDepth = 0, maxDepth = minDepth,
  edgeCollections = {}, {
    uniqueVertices = 'none', uniqueEdges = 'path', bfs = (uniqueVertices === 'global'), vFilter, eFilter, pFilter,
    returnVertices = true, returnEdges = true, returnPaths = true
  } = {}) {
  timestamp = timestamp || dbtime()

  let traversal

  const typeGroups = traverseSkeletonGraph(timestamp, svid, maxDepth, edgeCollections, bfs, uniqueVertices)
  const types = buildNodeIdGroupsByType(typeGroups)

  if (types.vertices.length) {
    const built = buildNodeGroupsByType(timestamp, types)
    traversal = buildFilteredGraph(svid, built.vertices, built.edges, minDepth, maxDepth, bfs, uniqueVertices,
      uniqueEdges, edgeCollections, vFilter, eFilter, pFilter)
  } else {
    traversal = {
      vertices: [],
      edges: [],
      paths: []
    }
  }

  const fieldSwitches = {
    vertices: returnVertices,
    edges: returnEdges,
    paths: returnPaths
  }

  return pickBy(traversal, (v, k) => fieldSwitches[k])
}

module.exports = attachSpan(traverse, 'traverse', cto)
