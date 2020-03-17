'use strict'

const show = require('../show')
const { parseExpr } = require('../helpers')
const { getAllPaths } = require('./helpers')
const { createNodeBracepath, removeFreeEdges } = require('../traverse/helpers')
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
    for (const type in types) {
      for (const id of path[type]) {
        const idParts = id.split('/')

        let group = types[type].find(group => group.coll === idParts[0])
        if (!group) {
          group = {
            coll: idParts[0],
            keys: new Set()
          }
          types[type].push(group)
        } else {
          group.keys.add(idParts[1])
        }
      }
    }
  }

  const built = {
    vertices: [],
    edges: []
  }
  if (types.vertices.length) {
    const vPath = createNodeBracepath(types.vertices)
    built.vertices = show(vPath, timestamp, { postFilter: vFilter })

    if (types.edges.length) {
      const ePath = createNodeBracepath(types.edges)
      built.edges = show(ePath, timestamp, { postFilter: eFilter })
    }

    removeFreeEdges(built.vertices, built.edges)
  }

  const builtPaths = []
  for (const path of paths) {
    const builtPath = {
      vertices: [],
      edges: []
    }

    let pathIsBroken = false

    for (const type of types) {
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
