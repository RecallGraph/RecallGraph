/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const { db, time: dbtime } = require('@arangodb')
const request = require('@arangodb/request')
const {
  sample,
  memoize,
  omit,
  isObject,
  pick,
  isEmpty,
  map,
  cloneDeep,
  zipObject,
  stubTrue,
  last
} = require(
  'lodash')
const init = require('../util/init')
const { cartesian, generateFilters } = require('../util')
const { traverse: traverseHandler } = require('../../../lib/handlers/traverseHandlers')
const { traverseSkeletonGraph } = require('../../../lib/operations/traverse/helpers')
const { parseExpr } = require('../../../lib/operations/helpers')

const { baseUrl } = module.context
const lineageCollName = module.context.collectionName('test_lineage')

// Private
function edgeIsValid (v, e, edgeCollections) {
  const eColl = e.data().coll

  switch (edgeCollections[eColl]) {
    case 'inbound':
      return e.source().same(v)
    case 'outbound':
      return e.target().same(v)
    case 'any':
      return true
    default:
      throw new Error(`Unknown collection match: ${{ e: e.data(), v: v.data(), edgeCollections, eColl }}`)
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
  const vData = omit(v.data(), 'id', 'coll')

  traversal.gSet.add(v.id())
  path.vertices.push(vData)
  path.vSet.add(v.id())

  let eData = null
  if (e) {
    eData = omit(e.data(), 'id', 'source', 'target', 'coll')
    path.edges.push(eData)
    path.eSet.add(e.id())
  }

  if (currentDepth >= minDepth && vFilterFn(vData) && eFilterFn(eData) && pFilterFn(path)) {
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

// Public
function traverse (cy, svid, minDepth, maxDepth, bfs, uniqueVertices, uniqueEdges, edgeCollections, vFilter, eFilter, pFilter) {
  const sv = cy.$id(svid)
  if (!sv.data()) {
    return { vertices: [], edges: [], paths: [] }
  }

  const vertices = cy.nodes().map(v => omit(v.data(), 'id', 'coll'))
  const edges = cy.edges().map(e => omit(e.data(), 'id', 'source', 'target', 'coll'))
  const vMap = zipObject(map(vertices, '_id'), vertices)
  const eMap = zipObject(map(edges, '_id'), edges)
  const traversal = {
    gSet: new Set(),
    vSet: new Set(),
    eSet: new Set(),
    paths: []
  }

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

const generateCombos = memoize((keys = [], include = true, {
  bfs = [false, true],
  uniqueVertices = ['none', 'path', 'global'],
  uniqueEdges = ['none', 'path'],
  timestamp = [undefined, ...init.getSampleDataRefs().milestones],
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

function testTraverseSkeletonGraphWithParams ({ bfs, uniqueVertices, uniqueEdges }) {
  const vertexCollNames = init.getSampleDataRefs().vertexCollections
  const combos = generateCombos(['timestamp', 'minDepth', 'relDepth', 'edgeCollections'])
  combos.forEach(combo => {
    const { timestamp, minDepth, relDepth, edgeCollections } = combo
    const maxDepth = minDepth + relDepth
    const svColl = db._collection(sample(vertexCollNames))
    const svid = svColl.any()._id
    const params = JSON.stringify(combo)

    const paths = traverseSkeletonGraph(timestamp || dbtime(), svid, minDepth, maxDepth, edgeCollections, bfs,
      uniqueVertices, uniqueEdges)

    expect(paths, params).to.be.an.instanceOf(Array)
    paths.forEach(path => {
      expect(path, params).to.be.an.instanceOf(Object)
      expect(path.vertices, params).to.be.an.instanceOf(Array)

      if (path.edges) {
        expect(path.edges, params).to.be.an.instanceOf(Array)
      }
    })

    const { milestones: tsMilestones, cyGraphs: { milestones: cyMilestones } } = init.getSampleDataRefs()
    const tsIdx = tsMilestones.findIndex(ts => ts === timestamp)
    let cy
    if (tsIdx === -1) {
      cy = last(cyMilestones)
    } else {
      cy = cyMilestones[tsIdx]
    }
    const nodeGroups = traverse(cy, svid, minDepth, maxDepth, bfs, uniqueVertices, uniqueEdges, edgeCollections)
    const expectedPaths = nodeGroups.paths.map(path => {
      const skelPath = {
        vertices: map(path.vertices, '_id')
      }

      if (path.edges.length) {
        skelPath.edges = map(path.edges, '_id')
      }

      return skelPath
    })

    expect(paths, params).to.have.deep.members(expectedPaths)
  })
}

function testTraverseWithParams ({ bfs, uniqueVertices, uniqueEdges }, traverseFn, useFilters = true) {
  const vertexCollNames = init.getSampleDataRefs().vertexCollections
  const combos = generateCombos(['bfs', 'uniqueVertices', 'uniqueEdges'], false)
  combos.forEach(combo => {
    const { timestamp, minDepth, relDepth, edgeCollections, returnVertices, returnEdges, returnPaths } = combo

    function test (nodeGroups, expectedNodeGroups, svid, filterCombo = {}) {
      const params = JSON.stringify(Object.assign({ svid, bfs, uniqueVertices, uniqueEdges }, combo, filterCombo))

      expect(nodeGroups, params).to.be.an.instanceOf(Object)

      if (returnVertices) {
        expect(nodeGroups.vertices, params).to.be.an.instanceOf(Array)
        expect(nodeGroups.vertices, params).to.have.deep.members(expectedNodeGroups.vertices)
      } else {
        expect(nodeGroups.vertices, params).to.be.undefined
      }

      if (returnEdges) {
        expect(nodeGroups.edges, params).to.be.an.instanceOf(Array)
        expect(nodeGroups.edges, params).to.have.deep.members(expectedNodeGroups.edges)
      } else {
        expect(nodeGroups.edges, params).to.be.undefined
      }

      if (returnPaths) {
        expect(nodeGroups.paths, params).to.be.an.instanceOf(Array)
        expect(nodeGroups.paths, params).to.have.deep.members(expectedNodeGroups.paths)
      } else {
        expect(nodeGroups.paths, params).to.be.undefined
      }
    }

    const maxDepth = minDepth + relDepth
    const svColl = db._collection(sample(vertexCollNames))
    const svid = svColl.any()._id
    const { milestones: tsMilestones, cyGraphs: { milestones: cyMilestones } } = init.getSampleDataRefs()
    const tsIdx = tsMilestones.findIndex(ts => ts === timestamp)
    let cy
    if (tsIdx === -1) {
      cy = last(cyMilestones)
    } else {
      cy = cyMilestones[tsIdx]
    }
    const unfilteredNodeGroups = traverse(cy, svid, minDepth, maxDepth, bfs, uniqueVertices, uniqueEdges,
      edgeCollections)

    let nodeGroups, expectedNodeGroups
    if (useFilters) {
      const vFilter = [null, generateFilters(unfilteredNodeGroups.vertices)]
      const eFilter = [null, generateFilters(unfilteredNodeGroups.edges)]
      const pFilter = [null, generateFilters(unfilteredNodeGroups.paths)]

      const filterCombos = cartesian({ vFilter, eFilter, pFilter })
      filterCombos.forEach(filterCombo => {
        const { vFilter, eFilter, pFilter } = filterCombo

        nodeGroups = traverseFn(timestamp, svid, minDepth, maxDepth, edgeCollections,
          { bfs, uniqueVertices, uniqueEdges, returnVertices, returnEdges, returnPaths, vFilter, eFilter, pFilter })
        expectedNodeGroups = traverse(cy, svid, minDepth, maxDepth, bfs, uniqueVertices, uniqueEdges, edgeCollections,
          vFilter, eFilter, pFilter)

        test(nodeGroups, expectedNodeGroups, svid, filterCombo)
      })
    } else {
      nodeGroups = traverseFn(timestamp, svid, minDepth, maxDepth, edgeCollections,
        { bfs, uniqueVertices, uniqueEdges, returnVertices, returnEdges, returnPaths })
      expectedNodeGroups = unfilteredNodeGroups

      test(nodeGroups, expectedNodeGroups, svid)
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
  traverse,
  testTraverseSkeletonGraphWithParams,
  testTraverseWithParams,
  traverseHandlerWrapper,
  traversePostWrapper
}
