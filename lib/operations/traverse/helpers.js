'use strict'

const { getComponentTagOption } = require('../../helpers')
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../../constants')
const { db, query } = require('@arangodb')
const { mapValues, zipObject, map, stubTrue, last } = require('lodash')
const show = require('../show')
const { utils: { attachSpan } } = require('@recallgraph/foxx-tracer')
const { parseExpr } = require('../helpers')

const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
const ends = {
  inbound: ['_from'],
  outbound: ['_to'],
  any: ['_from', '_to']
}
const cto = getComponentTagOption(__filename)

// Public
function getEnds (direction) {
  return ends[direction.toLowerCase()]
}

const traverseSkeletonGraph = attachSpan(
  function traverseSkeletonGraph (timestamp, svid, minDepth, maxDepth, edgeCollections, bfs, uniqueVertices, uniqueEdges) {
    const sv = skeletonVerticesColl.firstExample('meta.id', svid)
    const svl = sv && sv.validity
    const svv = svl && svl.some(vo => vo.valid_since <= timestamp && vo.valid_until > timestamp)

    if (svv) {
      minDepth *= 2
      maxDepth *= 2
      if (uniqueVertices === 'global') {
        bfs = true
      }

      const ecs = mapValues(edgeCollections, getEnds)

      return query`
        let ecs = ${ecs}
        let eca = attributes(ecs)
        
        for v, e, p in ${minDepth}..${maxDepth}
        any ${sv._id}
        graph ${SERVICE_GRAPHS.skeleton}
        
        prune v == null ||
          !length(v.validity[* filter CURRENT.valid_since <= ${timestamp} && CURRENT.valid_until > ${timestamp}]) ||
          e != null &&
          !length(e.validity[* filter CURRENT.valid_since <= ${timestamp} && CURRENT.valid_until > ${timestamp}]) ||
          is_same_collection(${SERVICE_COLLECTIONS.skeletonEdgeHubs}, v) &&
          (v.collection not in eca || ((v._id == e._from) ? '_from' : '_to') not in ecs[v.collection]) ||
          length(p.edges) % 2 == 0 && v == p.vertices[-3]
          
        options { bfs: ${bfs}, uniqueVertices: ${uniqueVertices}, uniqueEdges: ${uniqueEdges} }
          
        filter v != null &&
          length(v.validity[* filter CURRENT.valid_since <= ${timestamp} && CURRENT.valid_until > ${timestamp}])
        filter e == null ||
          length(e.validity[* filter CURRENT.valid_since <= ${timestamp} && CURRENT.valid_until > ${timestamp}])
        filter length(p.edges) % 2 == 0
        filter v != p.vertices[-3]
        
        let seh = p.vertices[-2]
        let oc = seh && seh.collection
        let dKey = e && (v._id == e._from) ? '_from' : '_to'
        filter e == null || oc in eca && dKey in ecs[oc]
        
        let pvmids = p.vertices[*].meta.id
        let maxIdx = length(pvmids) - 1
        
        return merge(
          for i in 0..maxIdx
          let t = i % 2 == 0 ? 'vertices' : 'edges'
          
          collect type = t into elements = pvmids[i]
          
          return {[type]: elements}
        )
      `.toArray()
    } else {
      return []
    }
  }, 'traverseSkeletonGraph', cto)

const buildFilteredPaths = attachSpan(
  function buildFilteredPaths (paths, built, vFilter, eFilter, pFilter) {
    const vFilterFn = vFilter ? parseExpr(vFilter) : stubTrue
    const eFilterFn = eFilter ? parseExpr(eFilter) : stubTrue
    const pFilterFn = pFilter ? parseExpr(pFilter) : stubTrue

    return paths.map(p => ({
      vertices: p.vertices.map(vid => built.vertices[vid]),
      edges: p.edges ? p.edges.map(eid => built.edges[eid]) : []
    })).filter(p => {
      const v = last(p.vertices)
      const e = last(p.edges) || null

      return vFilterFn(v) && eFilterFn(e) && pFilterFn(p)
    })
  }, 'buildFilteredGraph', cto)

const buildNodeIdGroupsByType = attachSpan(
  function buildNodeIdGroupsByType (paths, types = { vertices: [], edges: [] }) {
    function addToGroup (id, type) {
      const [coll, key] = id.split('/')

      let group = types[type].find(group => group.coll === coll)
      if (!group) {
        group = { coll, keys: new Set() }
        types[type].push(group)
      }

      group.keys.add(key)
    }

    for (const type in types) {
      for (const path of paths) {
        if (path[type]) {
          for (const id of path[type]) {
            if (id) {
              addToGroup(id, type)
            }
          }
        }
      }
    }

    return types
  }, 'buildNodeIdGroupsByType', cto)

const buildNodeGroupsByType = attachSpan(function buildNodeGroupsByType (timestamp, types, vFilter, eFilter) {
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

    built.vertices = zipObject(map(built.vertices, '_id'), built.vertices)
    built.edges = zipObject(map(built.edges, '_id'), built.edges)
  }

  return built
}, 'buildNodeGroupsByType', cto)

const createNodeBracepath = attachSpan(function createNodeBracepath (nodeGroups) {
  const pathSegments = nodeGroups.map(group => {
    let pathSegment = `${group.coll}/`

    const keys = Array.isArray(group.keys) ? group.keys : Array.from(group.keys)
    if (keys.length > 1) {
      pathSegment += `{${keys.join(',')}}`
    } else {
      pathSegment += keys[0]
    }

    return pathSegment
  })

  let path = '/n/'

  if (pathSegments.length > 1) {
    path += `{${pathSegments.join(',')}}`
  } else if (pathSegments.length === 1) {
    path += pathSegments[0]
  }

  return path
}, 'createNodeBracepath', cto)

module.exports = {
  getEnds,
  traverseSkeletonGraph,
  buildFilteredPaths,
  buildNodeIdGroupsByType,
  buildNodeGroupsByType,
  createNodeBracepath
}
