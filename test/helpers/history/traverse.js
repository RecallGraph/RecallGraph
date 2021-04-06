'use strict'

const { expect } = require('chai')
const { db, aql } = require('@arangodb')
const request = require('@arangodb/request')
const { chain, sample, memoize, omit, isObject, pick, isEmpty, map, remove, cloneDeep, zipObject, stubTrue } = require(
  'lodash')
const init = require('../util/init')
const show = require('../../../lib/operations/show')
const { cartesian, generateFilters } = require('../util')
const { getNonServiceCollections } = require('../../../lib/operations/helpers')
const { traverse: traverseHandler } = require('../../../lib/handlers/traverseHandlers')
const { getCollectionType } = require('../../../lib/helpers')
const { DOC_ID_REGEX } = require('../../../lib/constants')
const {
  traverseSkeletonGraph, createNodeBracepath
} = require('../../../lib/operations/traverse/helpers')
const cytoscape = require('cytoscape')
const { parseExpr } = require('../../../lib/operations/helpers')

const { baseUrl } = module.context
const lineageCollName = module.context.collectionName('test_lineage')

// Private
function removeFreeEdges (vertices, edges) {
  const vSet = new Set(map(vertices, '_id'))

  remove(edges, e => [e._from, e._to].some(vid => !vSet.has(vid)))
}

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

  if (currentDepth < maxDepth && childNbds.length) {
    breadthFirstWalk(traversal, minDepth, maxDepth, uniqueVertices, uniqueEdges, edgeCollections, vFilterFn,
      eFilterFn,
      pFilterFn, childNbds, currentDepth + 1)
  }
}

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
}

// Public
const generateCombos = memoize((keys = [], include = true, {
  bfs = [false, true],
  uniqueVertices = ['none', 'path', 'global'],
  uniqueEdges = ['none', 'path'],
  timestamp = [undefined, ...init.getMilestones()],
  minDepth = [0, 1],
  relDepth = [0, 1],
  edgeCollections = ['inbound', 'outbound', 'any'].map(dir => ({
    [lineageCollName]: dir
  })),
  returnVertices = [false, true],
  returnEdges = [false, true],
  returnPaths = [false, true]
} = {}) => {
  const kv = {
    bfs,
    uniqueVertices,
    uniqueEdges,
    timestamp,
    minDepth,
    relDepth,
    edgeCollections,
    returnVertices,
    returnEdges,
    returnPaths
  }

  return cartesian(isEmpty(keys) ? kv : include ? pick(kv, keys) : omit(kv, keys))
}, (keys, include) => {
  let cacheKey = 'default'

  if (!isEmpty(keys)) {
    const prefix = (include ? 'include' : 'exclude') + ':'
    cacheKey = prefix + keys.sort().join(':')
  }

  return cacheKey
})

function generateOptionCombos (bfs = true) {
  return generateCombos(['bfs', 'uniqueVertices', 'uniqueEdges'], true, { bfs: [bfs] })
}

function testTraverseSkeletonGraphWithParams ({ bfs, uniqueVertices }) {
  const vertexCollNames = init.getSampleDataRefs().vertexCollections
  const combos = generateCombos(['bfs', 'uniqueVertices', 'uniqueEdges'], false)
  combos.forEach(combo => {
    const { timestamp, minDepth, relDepth, edgeCollections } = combo
    const maxDepth = minDepth + relDepth
    const svColl = db._collection(sample(vertexCollNames))
    const svid = svColl.any()._id

    const nodeGroups = traverseSkeletonGraph(timestamp, svid, maxDepth, edgeCollections, bfs, uniqueVertices)
    const params = JSON.stringify(Object.assign({ bfs, uniqueVertices }, combo))

    expect(nodeGroups, params).to.be.an.instanceOf(Object)
    expect(nodeGroups.vertices, params).to.be.an.instanceOf(Array)
    expect(nodeGroups.edges, params).to.be.an.instanceOf(Array)

    nodeGroups.vertices.forEach(vid => {
      expect(vid, params).to.match(DOC_ID_REGEX)
    })

    nodeGroups.edges.forEach(eid => {
      expect(eid, params).to.match(DOC_ID_REGEX)
    })
  })
}

function testTraverseWithParams ({ bfs, uniqueVertices, uniqueEdges }, traverseFn, useFilters = true) {
  const vertexCollNames = init.getSampleDataRefs().vertexCollections
  const ssGraph = init.getSampleDataRefs().graphs[0]
  const collTypes = chain(getNonServiceCollections())
    .map(collName => [collName, getCollectionType(collName)])
    .fromPairs()
    .value()

  const combos = generateCombos(['bfs', 'uniqueVertices', 'uniqueEdges'], false)
  combos.forEach(combo => {
    const { timestamp, minDepth, relDepth, edgeCollections, returnVertices, returnEdges, returnPaths } = combo
    const svColl = db._collection(sample(vertexCollNames))
    const svid = svColl.any()._id
    const maxDepth = minDepth + relDepth
    const forcedBfs = uniqueVertices === 'global' || bfs

    const queryParts = [
      aql`
        let collTypes = ${collTypes}
        
        for v, e in 0..${maxDepth}
      `,
      aql.literal(`${edgeCollections[lineageCollName]} '${svid}'`),
      aql.literal(`graph '${ssGraph}'`),
      aql`
        options {bfs: ${forcedBfs}, uniqueVertices: ${uniqueVertices}, uniqueEdges: ${uniqueEdges}}
        
        collect aggregate vertices = unique(v._id), edges = unique(e._id)
        
        let vGroups = (
          for vid in vertices
          let vp = parse_identifier(vid)
          collect coll = vp.collection into keys = vp.key
          
          return {coll, keys}
        )
        let eGroups = (
          for eid in edges[* filter CURRENT != null]
          let ep = parse_identifier(eid)
          collect coll = ep.collection into keys = ep.key
          
          return {coll, keys}
        )
        
        return {vertices: vGroups, edges: eGroups}
      `
    ]
    const query = aql.join(queryParts, '\n')
    const cursor = db._query(query)

    const unfilteredNodes = cursor.next()
    cursor.dispose()

    const vPath = createNodeBracepath(unfilteredNodes.vertices)
    const ePath = unfilteredNodes.edges.length ? createNodeBracepath(unfilteredNodes.edges) : null

    const timeBoundVertices = show(vPath, timestamp)
    const timeBoundEdges = ePath ? show(ePath, timestamp) : []
    removeFreeEdges(timeBoundVertices, timeBoundEdges)

    let vFilter
    let eFilter
    let pFilter
    if (useFilters && timeBoundVertices.find(v => v._id === svid)) {
      const unfilteredTraversal = buildFilteredGraph(svid, timeBoundVertices, timeBoundEdges, minDepth, maxDepth,
        forcedBfs, uniqueVertices, uniqueEdges, edgeCollections)

      vFilter = generateFilters(unfilteredTraversal.vertices)
      eFilter = generateFilters(unfilteredTraversal.edges)
      pFilter = generateFilters(unfilteredTraversal.paths)
    }

    const filteredTraversal = traverseFn(timestamp, svid, minDepth, maxDepth, edgeCollections,
      { bfs, uniqueVertices, uniqueEdges, vFilter, eFilter, pFilter, returnVertices, returnEdges, returnPaths })

    const params = JSON.stringify(
      Object.assign({ bfs, forcedBfs, uniqueVertices, uniqueEdges, svid, vFilter, eFilter, pFilter }, combo))
    expect(filteredTraversal, params).to.be.an.instanceOf(Object)
    if (returnVertices) {
      expect(filteredTraversal.vertices, params).to.be.an.instanceOf(Array)
    }
    if (returnEdges) {
      expect(filteredTraversal.edges, params).to.be.an.instanceOf(Array)
    }
    if (returnPaths) {
      expect(filteredTraversal.paths, params).to.be.an.instanceOf(Array)
    }

    let expectedTraversal
    if (timeBoundVertices.find(v => v._id === svid)) {
      expectedTraversal = buildFilteredGraph(svid, timeBoundVertices, timeBoundEdges, minDepth, maxDepth, forcedBfs,
        uniqueVertices, uniqueEdges, edgeCollections, vFilter, eFilter, pFilter)
    } else {
      expectedTraversal = {
        vertices: [],
        edges: [],
        paths: []
      }
    }

    if (!returnVertices) {
      delete expectedTraversal.vertices
    }
    if (!returnEdges) {
      delete expectedTraversal.edges
    }
    if (!returnPaths) {
      delete expectedTraversal.paths
    }

    expect(Object.keys(filteredTraversal), params).to.have.members(Object.keys(expectedTraversal))
    for (const key in filteredTraversal) {
      expect(filteredTraversal[key], params).to.have.deep.members(expectedTraversal[key])
    }
  })
}

function traverseHandlerWrapper (timestamp, svid, minDepth, maxDepth, edgeCollections, options) {
  const req = { queryParams: { timestamp, svid, minDepth, maxDepth }, body: { edges: edgeCollections } }

  if (isObject(options)) {
    Object.assign(req.queryParams, omit(options, 'vFilter', 'eFilter', 'pFilter'))
    for (const key of ['vFilter', 'eFilter', 'pFilter']) {
      if (!isEmpty(options[key])) {
        req.body[key] = options[key]
      }
    }
  }

  return traverseHandler(req)
}

function traversePostWrapper (timestamp, svid, minDepth, maxDepth, edgeCollections, options) {
  const req = { json: true, timeout: 120, qs: { svid, minDepth, maxDepth }, body: { edges: edgeCollections } }

  if (timestamp) {
    req.qs.timestamp = timestamp
  }

  if (isObject(options)) {
    Object.assign(req.qs, omit(options, 'vFilter', 'eFilter', 'pFilter'))
    for (const key of ['vFilter', 'eFilter', 'pFilter']) {
      if (!isEmpty(options[key])) {
        req.body[key] = options[key]
      }
    }
  }

  const response = request.post(`${baseUrl}/history/traverse`, req)
  expect(response).to.be.an.instanceOf(Object)

  const params = JSON.stringify({ request: req, response: pick(response, 'statusCode', 'body', 'message') })
  expect(response.statusCode, params).to.equal(200)

  return JSON.parse(response.body)
}

module.exports = {
  generateCombos,
  generateOptionCombos,
  testTraverseSkeletonGraphWithParams,
  testTraverseWithParams,
  traverseHandlerWrapper,
  traversePostWrapper
}
