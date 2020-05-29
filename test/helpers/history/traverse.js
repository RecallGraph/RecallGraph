'use strict'

const { expect } = require('chai')
const { db, aql } = require('@arangodb')
const request = require('@arangodb/request')
const { chain, sample, memoize, omit, isObject, pick, isEmpty } = require('lodash')
const init = require('../util/init')
const show = require('../../../lib/operations/show')
const { cartesian, generateFilters } = require('../util')
const { getNonServiceCollections } = require('../../../lib/operations/helpers')
const { traverse: traverseHandler } = require('../../../lib/handlers/traverseHandlers')
const { getCollectionType } = require('../../../lib/helpers')
const { DOC_ID_REGEX } = require('../../../lib/constants')
const {
  traverseSkeletonGraph, createNodeBracepath, removeFreeEdges, buildFilteredGraph
} = require('../../../lib/operations/traverse/helpers')

const { baseUrl } = module.context
const lineageCollName = module.context.collectionName('test_lineage')

// Public
const generateCombos = memoize((keys = [], include = true, {
  bfs = [false, true],
  uniqueVertices = ['none', 'path', 'global'],
  uniqueEdges = ['none', 'path'],
  timestamp = [null, ...init.getMilestones()],
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

    let vFilter = null; let eFilter = null; let pFilter = null
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
