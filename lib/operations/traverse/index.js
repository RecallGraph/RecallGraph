'use strict'

const {
  traverseSkeletonGraph, buildFilteredPaths, buildNodeIdGroupsByType, buildNodeGroupsByType
} = require('./helpers')
const { time: dbtime } = require('@arangodb')
const { utils: { attachSpan } } = require('@recallgraph/foxx-tracer')
const { getComponentTagOption } = require('../../helpers')
const { pickBy, last, chain } = require('lodash')

const cto = getComponentTagOption(__filename)

function traverse (timestamp, svid, minDepth = 0, maxDepth = minDepth,
  edgeCollections = {}, {
    uniqueVertices = 'none', uniqueEdges = 'path', bfs = (uniqueVertices === 'global'), vFilter,
    eFilter, pFilter, returnVertices = true, returnEdges = true, returnPaths = true
  } = {}) {
  timestamp = timestamp || dbtime()

  let traversal

  const paths = traverseSkeletonGraph(timestamp, svid, minDepth, maxDepth, edgeCollections, bfs, uniqueVertices,
    uniqueEdges)
  const types = buildNodeIdGroupsByType(paths)

  if (types.vertices.length) {
    const built = buildNodeGroupsByType(timestamp, types)
    traversal = { paths: buildFilteredPaths(paths, built, vFilter, eFilter, pFilter) }

    if (returnVertices) {
      traversal.vertices = chain(traversal.paths).map('vertices').map(last).uniqBy('_id').value()
    }

    if (returnEdges) {
      traversal.edges = chain(traversal.paths).map('edges').map(last).compact().uniqBy('_id').value()
    }
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
