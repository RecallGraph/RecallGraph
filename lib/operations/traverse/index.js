'use strict'

const show = require('../show')
const { traverseSkeletonGraph, createNodeBracepath, removeFreeEdges, buildFilteredGraph } = require('./helpers')
const { COLLECTION_TYPES } = require('../../helpers')
const { time: dbtime } = require('@arangodb')

module.exports = function traverse (timestamp, svid, depth = 1, edgeCollections = {},
  { bfs = false, uniqueVertices = 'none', uniqueEdges = 'path', vFilter, eFilter } = {}) {
  timestamp = timestamp || dbtime()

  let traversal

  if (depth === 0) {
    traversal = {
      vertices: show(`/n/${svid}`, timestamp, { postFilter: vFilter }),
      edges: []
    }
  } else {
    const nodeGroups = traverseSkeletonGraph(timestamp, svid, depth, edgeCollections,
      { bfs, uniqueVertices, uniqueEdges })
    const vGroups = []
    const eGroups = []

    for (const group of nodeGroups) {
      if (group.type === COLLECTION_TYPES.VERTEX) {
        vGroups.push(group)
      } else {
        eGroups.push(group)
      }
    }

    if (vGroups.length) {
      let vertices, edges

      const vPath = createNodeBracepath(vGroups)
      vertices = show(vPath, timestamp, { postFilter: vFilter })

      if (eGroups.length) {
        const ePath = createNodeBracepath(eGroups)
        edges = show(ePath, timestamp, { postFilter: eFilter })
      } else {
        edges = []
      }

      removeFreeEdges(vertices, edges)
      traversal = buildFilteredGraph(svid, vertices, edges)
    } else {
      traversal = { vertices: [], edges: [] }
    }
  }

  return traversal
}
