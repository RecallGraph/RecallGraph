'use strict'

const { parseExpr } = require('../helpers')
const { buildNodeIdGroupsByType, buildNodeGroupsByType } = require('../traverse/helpers')
const { getAllPaths } = require('./helpers')
const { time: dbtime } = require('@arangodb')
const { chain } = require('lodash')

module.exports = function kShortestPaths (timestamp, svid, evid, depth = 1, k = 1, edgeCollections = {},
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

  const builtPaths = []
  for (const path of paths) {
    const builtPath = {
      vertices: [],
      edges: []
    }

    let pathIsBroken = false

    for (const type in path) {
      for (const id of path[type]) {
        const obj = built[type].find(node => node._id === id)
        if (!obj) {
          pathIsBroken = true
          break
        }

        builtPath[type].push(obj)
      }

      if (pathIsBroken) {
        break
      }
    }

    if (!pathIsBroken) {
      builtPaths.push(builtPath)
    }
  }

  const weightFn = parseExpr(weightExpr)

  return chain(builtPaths)
    .map(path => {
      path.cost = path.edges.reduce((cost, edge) => cost + weightFn(edge), 0)

      return path
    })
    .sortBy('cost')
    .slice(0, k)
    .value()
}
