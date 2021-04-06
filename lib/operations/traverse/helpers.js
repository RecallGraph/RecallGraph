'use strict'

const { getComponentTagOption } = require('../../helpers')
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../../constants')
const { db, query } = require('@arangodb')
const { chain, mapValues, zipObject, map, stubTrue, isNumber, intersection } = require('lodash')
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
          (v.collection not in eca || ((v._id == e._from) ? '_from' : '_to') not in ecs[v.collection])
          
        options { bfs: ${bfs}, uniqueVertices: ${uniqueVertices}, uniqueEdges: ${uniqueEdges} }
          
        filter v != null &&
          length(v.validity[* filter CURRENT.valid_since <= ${timestamp} && CURRENT.valid_until > ${timestamp}])
        filter e == null ||
          length(e.validity[* filter CURRENT.valid_since <= ${timestamp} && CURRENT.valid_until > ${timestamp}])
        filter length(p.edges) % 2 == 0
        
        let seh = p.vertices[-2]
        let oc = seh && seh.collection
        let dKey = e && (v._id == e._from) ? '_from' : '_to'
        filter e == null || oc in eca && dKey in ecs[oc]
        
        collect aggregate vertices = unique(v.meta.id), edges = unique(seh.meta.id) into pv = p.vertices[*].meta.id

        let paths = (
          for p in pv
          let maxIdx = length(p) - 1
          
          return merge(
            for i in 0..maxIdx
            let t = i % 2 == 0 ? 'vertices' : 'edges'
            
            collect type = t into elements = p[i]
            
            return {[type]: elements}
          )
        )
        
        return { vertices, edges, paths }
      `.toArray()[0]
    } else {
      return {
        vertices: [],
        edges: [],
        paths: []
      }
    }
  }, 'traverseSkeletonGraph', cto)

const buildFilteredGraph = attachSpan(
  function buildFilteredGraph (built, typeGroups, vFilter, eFilter, pFilter) {
    const vFilterFn = vFilter ? parseExpr(vFilter) : stubTrue
    const eFilterFn = eFilter ? parseExpr(eFilter) : stubTrue
    const pFilterFn = pFilter ? parseExpr(pFilter) : stubTrue

    typeGroups.vertices = typeGroups.vertices.map(vid => built.vertices[vid])
    typeGroups.edges = typeGroups.edges.map(eid => built.edges[eid])
    typeGroups.paths = typeGroups.paths.map(path => ({
      vertices: path.vertices.map(vid => built.vertices[vid]),
      edges: path.edges ? path.edges.map(eid => built.edges[eid]) : []
    }))

    const filteredIndexes = intersection(
      chain(typeGroups.vertices).map((v, idx) => vFilterFn(v) ? idx : false).filter(isNumber).value(),
      chain(typeGroups.edges).map((e, idx) => eFilterFn(e) ? idx : false).filter(isNumber).value(),
      chain(typeGroups.paths).map((p, idx) => pFilterFn(p) ? idx : false).filter(isNumber).value()
    )

    typeGroups.vertices = filteredIndexes.map(idx => typeGroups.vertices[idx])

    typeGroups.edges = filteredIndexes.map(idx => typeGroups.edges[idx])
    if (!typeGroups.edges[0]) {
      typeGroups.edges.shift()
    }

    typeGroups.paths = filteredIndexes.map(idx => typeGroups.paths[idx])
  }, 'buildFilteredGraph', cto)

const buildNodeIdGroupsByType = attachSpan(
  function buildNodeIdGroupsByType (typeGroups, types = { vertices: [], edges: [] }) {
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
      for (const id of typeGroups[type]) {
        if (id) {
          addToGroup(id, type)
        }
      }

      for (const path of typeGroups.paths) {
        if (path[type]) {
          for (const id of path[type]) {
            addToGroup(id, type)
          }
        }
      }
    }

    return types
  }, 'buildNodeIdGroupsByType', cto)

const buildNodeGroupsByType = attachSpan(function buildNodeGroupsByType (timestamp, types) {
  const built = {
    vertices: [],
    edges: []
  }
  if (types.vertices.length) {
    const vPath = createNodeBracepath(types.vertices)
    built.vertices = show(vPath, timestamp)

    if (types.edges.length) {
      const ePath = createNodeBracepath(types.edges)
      built.edges = show(ePath, timestamp)
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
  buildFilteredGraph,
  buildNodeIdGroupsByType,
  buildNodeGroupsByType,
  createNodeBracepath
}
