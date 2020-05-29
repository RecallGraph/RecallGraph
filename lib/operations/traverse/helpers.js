'use strict'

const { getComponentTagOption } = require('../../helpers')
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../../constants')
const { db, query } = require('@arangodb')
const { mapValues, remove, zipObject, map, cloneDeep, stubTrue, omit, last } = require('lodash')
const show = require('../show')
const { utils: { attachSpan } } = require('foxx-tracing')
const cytoscape = require('cytoscape')
const { parseExpr } = require('../helpers')

const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
const cto = getComponentTagOption(__filename)

function edgeIsValid (v, e, edgeCollections) {
  const eColl = e.id().split('/')[0]

  switch (edgeCollections[eColl]) {
    case 'inbound':
      return e.source().same(v)
    case 'outbound':
      return e.target().same(v)
    default:
      return true
  }
}

function visitIsValid (traversal, uniqueVertices, uniqueEdges, edgeCollections, v, e, currentPath) {
  let visitIsValid = (e === null) || edgeIsValid(v, e, edgeCollections)

  if (visitIsValid) {
    switch (uniqueVertices) {
      case 'global':
        visitIsValid = !traversal.gSet.has(v.id())
        break

      case 'path':
        visitIsValid = !currentPath.vSet.has(v.id())
        break
    }
  }

  if (visitIsValid && uniqueEdges === 'path') {
    visitIsValid = (e === null) || !currentPath.eSet.has(e.id())
  }

  return visitIsValid
}

function addVisit (traversal, minDepth, v, e, currentDepth, currentPath, vFilterFn, eFilterFn, pFilterFn) {
  const path = cloneDeep(currentPath)
  const vData = omit(v.data(), 'id')

  traversal.gSet.add(v.id())
  path.vertices.push(vData)
  path.vSet.add(v.id())

  let eData = null
  if (e) {
    eData = omit(e.data(), 'id', 'source', 'target')
    path.edges.push(eData)
    path.eSet.add(e.id())
  }

  if (currentDepth >= minDepth && vFilterFn(vData) && (!eData || eFilterFn(eData)) && pFilterFn(path)) {
    traversal.vSet.add(v.id())
    traversal.paths.push(path)

    if (e) {
      traversal.eSet.add(e.id())
    }
  }

  return path
}

function getNeighborhood (v) {
  return v.neighborhood().reduce((acc, el) => {
    if (!acc) {
      acc = {}
    }

    if (el.isNode()) {
      acc[el.id()] = {
        vertex: el,
        edges: []
      }
    } else {
      const groupNode = el.connectedNodes(`[id != '${v.id()}']`)
      acc[groupNode.id()].edges.push(el)
    }

    return acc
  })
}

const depthFirstWalk = attachSpan(
  function depthFirstWalk (traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn,
    eFilterFn, pFilterFn, v, e = null, currentDepth = 0,
    currentPath = { vertices: [], edges: [], vSet: new Set(), eSet: new Set() }) {
    if (visitIsValid(traversal, uniqueVertices, uniqueEdges, edgeCollections, v, e, currentPath)) {
      const path = addVisit(traversal, minDepth, v, e, currentDepth, currentPath, vFilterFn, eFilterFn, pFilterFn)

      if (currentDepth < maxDepth) {
        const nbd = getNeighborhood(v)

        for (const key in nbd) {
          const group = nbd[key]
          const nv = group.vertex

          for (const ne of group.edges) {
            depthFirstWalk(traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn,
              eFilterFn, pFilterFn, nv, ne, currentDepth + 1, path)
          }
        }
      }
    }
  }, 'depthFirstWalk', cto)

const breadthFirstWalk = attachSpan(
  function breadthFirstWalk (traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn,
    eFilterFn, pFilterFn, nbds, currentDepth = 0) {
    const childNbds = []

    for (const nbd of nbds) {
      const { groups, path: currentPath } = nbd

      for (const key in groups) {
        const group = groups[key]
        const v = group.vertex

        for (const e of group.edges) {
          if (visitIsValid(traversal, uniqueVertices, uniqueEdges, edgeCollections, v, e, currentPath)) {
            const path = addVisit(traversal, minDepth, v, e, currentDepth, currentPath, vFilterFn, eFilterFn, pFilterFn)

            if (currentDepth < maxDepth) {
              childNbds.push({
                path,
                groups: getNeighborhood(v)
              })
            }
          }
        }
      }
    }

    if (currentDepth < maxDepth) {
      breadthFirstWalk(traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn,
        eFilterFn,
        pFilterFn, childNbds, currentDepth + 1)
    }
  }, 'breadthFirstWalk', cto)

// Public
function getEnds (direction) {
  const ends = []

  switch (direction.toLowerCase()) {
    case 'inbound':
      ends.push('_from')

      break
    case 'outbound':
      ends.push('_to')

      break
    case 'any':
      ends.push('_from', '_to')
  }

  return ends
}

const traverseSkeletonGraph = attachSpan(
  function traverseSkeletonGraph (timestamp, svid, maxDepth, edgeCollections, bfs, uniqueVertices) {
    const sv = skeletonVerticesColl.firstExample('meta.id', svid)
    const svl = sv && sv.validity
    const svo = last(svl)

    if (svo && (svo.valid_since <= timestamp) && (svo.valid_until > timestamp)) {
      maxDepth *= 2
      if (uniqueVertices === 'none') {
        uniqueVertices = 'path'
      } else if (uniqueVertices === 'global') {
        bfs = true
      }

      const ecs = mapValues(edgeCollections, getEnds)

      return query`
        let ecs = ${ecs}
        let eca = attributes(ecs)
        
        for v, e, p in 0..${maxDepth}
        any ${sv._id}
        graph ${SERVICE_GRAPHS.skeleton}
        
        prune v == null ||
          !length(v.validity[* filter CURRENT.valid_since <= ${timestamp} && CURRENT.valid_until > ${timestamp}]) ||
          e != null &&
          !length(e.validity[* filter CURRENT.valid_since <= ${timestamp} && CURRENT.valid_until > ${timestamp}]) ||
          is_same_collection(${SERVICE_COLLECTIONS.skeletonEdgeHubs}, v) &&
          (v.collection not in eca || ((v._id == e._from) ? '_from' : '_to') not in ecs[v.collection])
          
        options { bfs: ${bfs}, uniqueVertices: ${uniqueVertices} }
          
        filter v != null &&
          length(v.validity[* filter CURRENT.valid_since <= ${timestamp} && CURRENT.valid_until > ${timestamp}])
        filter e == null ||
          length(e.validity[* filter CURRENT.valid_since <= ${timestamp} && CURRENT.valid_until > ${timestamp}])
        filter length(p.edges) % 2 == 0
        
        let seh = p.vertices[-2]
        let oc = seh && seh.collection
        let dKey = e && (v._id == e._from) ? '_from' : '_to'
        filter e == null || oc in eca && dKey in ecs[oc]
        
        collect aggregate vertices = unique(v.meta.id), edges = unique(seh.meta.id)
        
        return {vertices, edges: edges[* filter CURRENT != null]}
      `.toArray()[0]
    } else {
      return {
        vertices: [],
        edges: []
      }
    }
  }, 'traverseSkeletonGraph', cto)

const buildFilteredGraph = attachSpan(
  function buildFilteredGraph (svid, vertices, edges, minDepth, maxDepth, bfs, uniqueVertices, uniqueEdges,
    edgeCollections, vFilter, eFilter, pFilter) {
    const cy = cytoscape()

    cy.startBatch()

    cy.add(vertices.map(v => ({
      group: 'nodes',
      data: Object.assign({
        id: v._id
      }, v)
    })))

    cy.add(edges.map(e => ({
      group: 'edges',
      data: Object.assign({
        id: e._id,
        source: e._from,
        target: e._to
      }, e)
    })))

    cy.endBatch()

    const vMap = zipObject(map(vertices, '_id'), vertices)
    const eMap = zipObject(map(edges, '_id'), edges)
    const traversal = {
      gSet: new Set(),
      vSet: new Set(),
      eSet: new Set(),
      paths: []
    }
    const sv = cy.$id(svid)
    const vFilterFn = vFilter ? parseExpr(vFilter) : stubTrue
    const eFilterFn = eFilter ? parseExpr(eFilter) : stubTrue
    const pFilterFn = pFilter ? parseExpr(pFilter) : stubTrue

    if (uniqueVertices === 'global') {
      bfs = true
    }

    if (bfs) {
      breadthFirstWalk(traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn,
        eFilterFn,
        pFilterFn, [
          {
            path: { vertices: [], edges: [], vSet: new Set(), eSet: new Set() },
            groups: {
              [sv.id()]: {
                vertex: sv,
                edges: [null]
              }
            }
          }
        ])
    } else {
      depthFirstWalk(traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn, eFilterFn,
        pFilterFn, sv)
    }

    traversal.vertices = Array.from(traversal.vSet).map(id => vMap[id])
    traversal.edges = Array.from(traversal.eSet).map(id => eMap[id])

    delete traversal.gSet
    delete traversal.vSet
    delete traversal.eSet
    for (const path of traversal.paths) {
      delete path.vSet
      delete path.eSet
    }

    return traversal
  }, 'buildFilteredGraph', cto)

const buildNodeIdGroupsByType = attachSpan(
  function buildNodeIdGroupsByType (typeGroups, types = { vertices: [], edges: [] }) {
    for (const type in types) {
      for (const id of typeGroups[type]) {
        const idParts = id.split('/')

        let group = types[type].find(group => group.coll === idParts[0])
        if (!group) {
          group = {
            coll: idParts[0],
            keys: new Set()
          }
          types[type].push(group)
        }

        group.keys.add(idParts[1])
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

    removeFreeEdges(built.vertices, built.edges)
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

const removeFreeEdges = attachSpan(function removeFreeEdges (vertices, edges) {
  const vSet = new Set(map(vertices, '_id'))

  remove(edges, e => [e._from, e._to].some(vid => !vSet.has(vid)))
}, 'removeFreeEdges', cto)

module.exports = {
  getEnds,
  traverseSkeletonGraph,
  buildFilteredGraph,
  buildNodeIdGroupsByType,
  buildNodeGroupsByType,
  createNodeBracepath,
  removeFreeEdges
}
