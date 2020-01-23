'use strict'

const filter = require('../filter')
const { traverseSkeletonGraph, createNodeBracepath, removeOrphans, buildFilteredGraph } = require('./helpers')
const { COLLECTION_TYPES } = require('../../helpers')
const { time: dbtime } = require('@arangodb')

module.exports = function traverse (timestamp, svid, depth = 1, edgeCollections = {},
  { bfs = false, uniqueVertices = 'none', uniqueEdges = 'path', vFilter, eFilter } = {}) {
  timestamp = timestamp || dbtime()

  let path

  if (depth === 0) {
    path = {
      vertices: filter(`/n/${svid}`, timestamp, vFilter),
      edges: []
    }
  } else {
    const nodeGroups = traverseSkeletonGraph(timestamp, svid, depth, edgeCollections,
      { bfs, uniqueVertices, uniqueEdges })
    const vGroups = []; const eGroups = []

    for (const group of nodeGroups) {
      if (group.type === COLLECTION_TYPES.VERTEX) {
        vGroups.push(group)
      } else {
        eGroups.push(group)
      }
    }

    const vPath = createNodeBracepath(vGroups)
    const ePath = createNodeBracepath(eGroups)

    const vertices = filter(vPath, timestamp, vFilter)
    const edges = filter(ePath, timestamp, eFilter)
    removeOrphans(vertices, edges)

    path = buildFilteredGraph(svid, vertices, edges)
  }

  return path
}
