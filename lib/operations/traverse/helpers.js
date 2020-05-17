'use strict'

const { SERVICE_COLLECTIONS, SERVICE_GRAPHS, getComponentTagOption } = require('../../helpers')
const { db, query } = require('@arangodb')
const { mapValues, remove, zipObject, map, cloneDeep, stubTrue, omit } = require('lodash')
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
      return e.source() === v.id()
    case 'outbound':
      return e.target() === v.id()
    default:
      return true
  }
}

function visitIsValid (traversal, uniqueVertices, uniqueEdges, edgeCollections, v, e, currentPath) {
  let visitIsValid = (e === null) || edgeIsValid(v, e, edgeCollections)

  if (visitIsValid) {
    switch (uniqueVertices) {
      case 'global':
        visitIsValid = !traversal.vSet.has(v.id())
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
  let eData = null

  if (e !== null) {
    eData = omit(e.data(), 'id')
    path.edges.push(eData)
    path.eSet.add(e.id())
  }
  path.vertices.push(vData)
  path.vSet.add(v.id())

  if (currentDepth >= minDepth && vFilterFn(vData) && (eData === null || eFilterFn(eData)) && pFilterFn(path)) {
    traversal.paths.push(path)

    const startDepth = Math.max(minDepth, path.recDepth + 1)
    for (let i = startDepth; i < path.vertices.length; i++) {
      traversal.vSet.add(path.vertices[i]._id)

      if (i > startDepth) {
        traversal.eSet.add(path.edges[i - 1]._id)
      }
    }
    path.recDepth = path.edges.length
  }

  return path
}

function getNeighborhood (v) {
  // const nbd = v.neighborhood()
  // const groups = {}
  //
  // nbd.filter('node').forEach(node => {
  //   groups[node.id()] = {
  //     vertex: node,
  //     edges: []
  //   }
  // })
  //
  // nbd.filter('edge').forEach(edge => {
  //   const groupNode = edge.connectedNodes(`[id != '${v.id()}']`)
  //   groups[groupNode.id()].edges.push(edge)
  // })
  //
  // return groups

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

function depthFirstWalk (traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn,
  eFilterFn, pFilterFn, v, e = null, currentDepth = 0,
  currentPath = { vertices: [], edges: [], vSet: new Set(), eSet: new Set(), recDepth: -1 }) {
  if (visitIsValid(traversal, uniqueVertices, uniqueEdges, edgeCollections, v, e, currentPath)) {
    const path = addVisit(traversal, minDepth, v, e, currentDepth, currentPath, vFilterFn, eFilterFn, pFilterFn)

    if (currentDepth < maxDepth) {
      const depth = currentDepth + 1
      const nbd = getNeighborhood(v)

      for (const key in nbd) {
        const group = nbd[key]
        const nv = group.vertex

        for (const ne of group.edges) {
          depthFirstWalk(traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn,
            eFilterFn, pFilterFn, nv, ne, depth, path)
        }
      }
    }
  }
}

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
    breadthFirstWalk(traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn, eFilterFn,
      pFilterFn, childNbds, currentDepth + 1)
  }
}

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

function traverseSkeletonGraph (timestamp, svid, maxDepth, edgeCollections, bfs, uniqueVertices) {
  const sv = skeletonVerticesColl.firstExample('meta.id', svid)

  if (sv && (sv.valid_since <= timestamp) && (!sv.valid_until || (sv.valid_until > timestamp))) {
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
        v.valid_since > ${timestamp} ||
        (has(v, 'valid_until') ? v.valid_until <= ${timestamp} : false) ||
        e != null &&
        (e.valid_since > ${timestamp} || (has(e, 'valid_until') ? e.valid_until <= ${timestamp} : false)) ||
        is_same_collection(${SERVICE_COLLECTIONS.skeletonEdgeHubs}, v) &&
        (v.collection not in eca || ((v._id == e._from) ? '_from' : '_to') not in ecs[v.collection])
        
      options { bfs: ${bfs}, uniqueVertices: ${uniqueVertices} }
        
      filter v != null && v.valid_since <= ${timestamp} && (has(v, 'valid_until') ? v.valid_until > ${timestamp} : true)
      filter e == null || e.valid_since <= ${timestamp} && (has(e, 'valid_until') ? e.valid_until > ${timestamp} : true)
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
}

/*
 function buildFilteredGraph (svid, vertices, edges, traversal = { vertices: [], edges: [] }) {
 const [v] = remove(vertices, v => v._id === svid)
 if (v) {
 traversal.vertices.push(v)

 const incidentEdges = remove(edges, e => [e._from, e._to].includes(v._id))
 traversal.edges.push(...incidentEdges)

 for (const e of incidentEdges) {
 const nvid = (e._from === v._id) ? e._to : e._from

 buildFilteredGraph(nvid, vertices, edges, traversal)
 }
 }

 return traversal
 }
 */

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
    breadthFirstWalk(traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn, eFilterFn,
      pFilterFn, [
        {
          path: { vertices: [], edges: [], vSet: new Set(), eSet: new Set(), recDepth: -1 },
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

  delete traversal.vSet
  delete traversal.eSet
  for (const path of traversal.paths) {
    delete path.vSet
    delete path.eSet
    delete path.recDepth
  }

  return traversal
}

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
}

function buildNodeGroupsByType (timestamp, types) {
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
}

function createNodeBracepath (nodeGroups) {
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
}

function removeFreeEdges (vertices, edges) {
  const vSet = new Set(map(vertices, '_id'))

  remove(edges, e => [e._from, e._to].some(vid => !vSet.has(vid)))
}

module.exports = {
  getEnds,
  traverseSkeletonGraph: attachSpan(traverseSkeletonGraph, 'traverseSkeletonGraph', cto),
  buildFilteredGraph,
  buildNodeIdGroupsByType: attachSpan(buildNodeIdGroupsByType, 'buildNodeIdGroupsByType', cto),
  buildNodeGroupsByType: attachSpan(buildNodeGroupsByType, 'buildNodeGroupsByType', cto),
  createNodeBracepath,
  removeFreeEdges
}
