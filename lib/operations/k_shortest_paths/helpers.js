'use strict'

const { getComponentTagOption } = require('../../helpers')
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../../constants')
const { db, query } = require('@arangodb')
const { mapValues, chain, last } = require('lodash')
const { utils: { attachSpan } } = require('foxx-tracing')
const { getEnds } = require('../traverse/helpers')

const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
const cto = getComponentTagOption(__filename)

exports.getAllPaths = attachSpan(function getAllPaths (timestamp, svid, evid, depth, edgeCollections) {
  depth *= 2

  const sv = skeletonVerticesColl.firstExample('meta.id', svid)
  const ev = skeletonVerticesColl.firstExample('meta.id', evid)
  const svl = sv && sv.validity
  const svo = last(svl)
  const evl = ev && ev.validity
  const evo = last(evl)

  if (svo && evo && (svo.valid_since <= timestamp) && (svo.valid_until > timestamp) &&
      (evo.valid_since <= timestamp) && (evo.valid_until > timestamp)) {
    if (sv._id === ev._id) {
      return [
        {
          vertices: [sv._id],
          edges: []
        }
      ]
    }

    const ecs = mapValues(edgeCollections, getEnds)

    return query`
      let ecs = ${ecs}
      let eca = attributes(ecs)
      
      for v, e, p in 2..${depth}
      any ${sv._id}
      graph ${SERVICE_GRAPHS.skeleton}
      
      prune v == null || v._id == ${ev._id} || v.valid_since > ${timestamp} ||
        (has(v, 'valid_until') ? v.valid_until <= ${timestamp} : false) ||
        e != null &&
        (e.valid_since > ${timestamp} || (has(e, 'valid_until') ? e.valid_until <= ${timestamp} : false)) ||
        is_same_collection(${SERVICE_COLLECTIONS.skeletonEdgeHubs}, v) &&
        (v.collection not in eca || ((v._id == e._from) ? '_from' : '_to') not in ecs[v.collection])
        
      options { uniqueVertices: 'path' }
        
      filter v._id == ${ev._id}
      filter e.valid_since <= ${timestamp} && (has(e, 'valid_until') ? e.valid_until > ${timestamp} : true)
      
      let seh = is_same_collection(${SERVICE_COLLECTIONS.skeletonEdgeHubs}, v) ? v : p.vertices[-2]
      let oc = seh && seh.collection
      let dKey = (v._id == e._from) ? '_from' : '_to'
      filter oc in eca && dKey in ecs[oc]
      
      let maxIdx = length(p.vertices) - 1
      return merge(
        for i in 0..maxIdx
        let t = i % 2 == 0 ? 'vertices' : 'edges'
        collect type = t into elements = p.vertices[i].meta.id
        return {[type]: elements}
      )
      
  `.toArray()
  } else {
    return []
  }
}, 'getAllPaths', cto)

exports.buildPaths = attachSpan(function buildPaths (built, paths) {
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

  return builtPaths
}, 'buildPaths', cto)

exports.kShortestPaths = attachSpan(function kShortestPaths (builtPaths, weightFn, skip, limit) {
  return chain(builtPaths)
    .map(path => {
      path.cost = path.edges.reduce((cost, edge) => cost + weightFn(edge), 0)

      return path
    })
    .sortBy('cost')
    .slice(skip, limit)
    .value()
}, 'kShortestPaths', cto)
