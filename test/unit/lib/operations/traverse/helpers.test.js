/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/util/init')
const {
  testTraverseSkeletonGraphWithParams, generateOptionCombos, generateCombos
} = require('../../../../helpers/history/traverse')
const {
  createNodeBracepath, buildFilteredGraph, removeFreeEdges, getEnds
} = require('../../../../../lib/operations/traverse/helpers')
const { db, query, aql } = require('@arangodb')
const { shuffle, chain, sample, cloneDeep, stubTrue } = require('lodash')
const { cartesian, generateFilters } = require('../../../../helpers/util')
const { parseExpr } = require('../../../../../lib/operations/helpers')

describe('Traverse Helpers - getEnds', () => {
  before(init.setup)

  after(init.teardown)

  it('should return _from when direction=inbound', () => {
    const ends = getEnds('inbound')

    expect(ends).to.deep.equal(['_from'])
  })

  it('should return _to when direction=outbound', () => {
    const ends = getEnds('outbound')

    expect(ends).to.deep.equal(['_to'])
  })

  it('should return _from,_to when direction=any', () => {
    const ends = getEnds('any')

    expect(ends).to.be.an.instanceOf(Array)
    expect(ends).to.deep.have.deep.members(['_from', '_to'])
  })
})

describe('Traverse Helpers - traverseSkeletonGraph', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const bfs = [true]
    const uniqueVertices = ['none', 'path', 'global']

    const combos = cartesian({ bfs, uniqueVertices })
    combos.forEach(combo => testTraverseSkeletonGraphWithParams(combo))
  })

  it('should return collected vertex+edge sets when bfs=false', () => {
    const combos = generateOptionCombos(false)
    combos.forEach(combo => testTraverseSkeletonGraphWithParams(combo))
  })
})

describe('Traverse Helpers - createNodeBracepath', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a blank path for an empty array', () => {
    const nodeGroups = []
    const path = createNodeBracepath(nodeGroups)

    expect(path).to.equal('/n/')
  })

  it('should return a simple path for an array of length 1', () => {
    const nodeGroups = [{ coll: 'a', keys: ['1'] }]
    const path = createNodeBracepath(nodeGroups)

    expect(path).to.equal('/n/a/1')
  })

  it('should return a L1 grouped path for an array of length > 1 with distinct collection components', () => {
    const nodeGroups = [{ coll: 'a', keys: ['1'] }, { coll: 'b', keys: ['1'] }]
    const path = createNodeBracepath(nodeGroups)

    expect(path).to.equal('/n/{a/1,b/1}')
  })

  it('should return a L2 grouped path for an array of length > 1 with recurring collection components', () => {
    const nodeGroups = [{ coll: 'a', keys: ['1'] }, { coll: 'b', keys: ['1', '2'] }]
    const path = createNodeBracepath(nodeGroups)

    expect(path).to.equal('/n/{a/1,b/{1,2}}')
  })
})

describe('Traverse Helpers - buildFilteredGraph', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return a connected graph from the provided vertex and edge sets, given a start vertex', () => {
    const reducer = (acc, { v, e, p }) => {
      if (!acc.vSet.has(v._id)) {
        acc.vSet.add(v._id)
        acc.vertices.push(v)
      }

      if (e && !acc.eSet.has(e._id)) {
        acc.eSet.add(e._id)
        acc.edges.push(e)
      }

      acc.paths.push(p)

      return acc
    }
    const initial = {
      vSet: new Set(),
      eSet: new Set(),
      vertices: [],
      edges: [],
      paths: []
    }

    const [lineageColl, starsColl, planetsColl, moonsColl] = ['lineage', 'stars', 'planets', 'moons'].map(
      suffix => db._collection(module.context.collectionName(`test_${suffix}`)))
    const vertexCollNames = [starsColl, planetsColl, moonsColl].map(coll => coll.name())
    const edges = shuffle(lineageColl.all().toArray())
    const vertices = chain([starsColl, planetsColl, moonsColl]).flatMap(coll => coll.all().toArray()).shuffle().value()
    removeFreeEdges(vertices, edges)

    const combos = generateCombos(['minDepth', 'relDepth', 'bfs', 'uniqueVertices', 'uniqueEdges', 'edgeCollections'])
    combos.forEach(combo => {
      const { minDepth, relDepth, bfs, uniqueVertices, uniqueEdges, edgeCollections } = combo
      const maxDepth = minDepth + relDepth
      const svid = sample(vertices)._id
      const forcedBfs = uniqueVertices === 'global' || bfs

      const queryParts = [
        aql`
          let vColls = ${vertexCollNames}
      
          for v, e, p in ${minDepth}..${maxDepth}
        `,
        aql.literal(`${edgeCollections[lineageColl.name()]} '${svid}'`),
        aql`
          ${lineageColl}
          
          prune parse_identifier(v).collection not in vColls
          
          options { bfs: ${forcedBfs}, uniqueVertices: ${uniqueVertices}, uniqueEdges: ${uniqueEdges} }
          
          filter parse_identifier(v).collection in vColls
          
          return { v, e, p }
        `
      ]
      const query = aql.join(queryParts, '\n')
      const result = db._query(query).toArray()
      const unfilteredGraph = result.reduce(reducer, cloneDeep(initial))
      const vFilter = [null, generateFilters(unfilteredGraph.vertices)]
      const eFilter = [null, generateFilters(unfilteredGraph.edges)]
      const pFilter = [null, generateFilters(unfilteredGraph.paths)]

      const combos = cartesian({ vFilter, eFilter, pFilter })
      combos.forEach(combo => {
        const { vFilter, eFilter, pFilter } = combo
        const vFilterFn = vFilter ? parseExpr(vFilter) : stubTrue
        const eFilterFn = eFilter ? parseExpr(eFilter) : stubTrue
        const pFilterFn = pFilter ? parseExpr(pFilter) : stubTrue

        const filteredGraph = buildFilteredGraph(svid, vertices, edges, minDepth, maxDepth, bfs, uniqueVertices,
          uniqueEdges, edgeCollections, vFilter, eFilter, pFilter)

        let params = JSON.stringify(
          {
            svid,
            forcedBfs,
            minDepth,
            maxDepth,
            bfs,
            uniqueVertices,
            uniqueEdges,
            edgeCollections,
            vFilter,
            eFilter,
            pFilter
          })
        expect(filteredGraph, params).to.be.an.instanceOf(Object)
        expect(filteredGraph.vertices, params).to.be.an.instanceOf(Array)
        expect(filteredGraph.edges, params).to.be.an.instanceOf(Array)
        expect(filteredGraph.paths, params).to.be.an.instanceOf(Array)

        const filteredResult = result.filter(({ v, e, p }) => (vFilterFn(v) && (!e || eFilterFn(e)) && pFilterFn(p)))
        const expectedGraph = filteredResult.reduce(reducer, cloneDeep(initial))
        delete expectedGraph.vSet
        delete expectedGraph.eSet

        expect(Object.keys(filteredGraph), params).to.have.members(Object.keys(expectedGraph))
        expect(filteredGraph.vertices, params).to.have.deep.members(expectedGraph.vertices)
        expect(filteredGraph.edges, params).to.have.deep.members(expectedGraph.edges)
        expect(filteredGraph.paths, params).to.have.deep.members(expectedGraph.paths)
      })
    })
  })
})

describe('Traverse Helpers - removeFreeEdges', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should remove free edges given a specific vertex and edge set', () => {
    const [lineageColl, starsColl, planetsColl, moonsColl] = ['lineage', 'stars', 'planets', 'moons'].map(
      suffix => db._collection(module.context.collectionName(`test_${suffix}`)))

    const edges = shuffle(lineageColl.all().toArray())
    const vertices = chain([starsColl, planetsColl, moonsColl]).flatMap(coll => coll.all().toArray()).shuffle().value()
    removeFreeEdges(vertices, edges)

    const svid = starsColl.any()._id
    const vertexCollNames = [starsColl, planetsColl, moonsColl].map(coll => coll.name())
    const cursor = query`
      let vColls = ${vertexCollNames}
    
      for v, e in 0..2
      outbound ${svid}
      ${lineageColl}
      
      prune parse_identifier(v).collection not in vColls
      
      filter parse_identifier(v).collection in vColls
      
      collect aggregate edges = unique(e)

      return edges[* filter CURRENT != null]
    `
    const expectedEdges = cursor.next()
    cursor.dispose()

    expect(edges).to.have.deep.members(expectedEdges)
  })
})
