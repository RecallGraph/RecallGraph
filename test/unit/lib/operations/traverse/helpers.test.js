/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/util/init')
const { testTraverseSkeletonGraphWithParams, generateOptionCombos } = require('../../../../helpers/history/traverse')
const {
  createNodeBracepath, buildFilteredGraph, removeFreeEdges
} = require('../../../../../lib/operations/traverse/helpers')
const { db, query } = require('@arangodb')
const { shuffle, chain } = require('lodash')

describe('Traverse Helpers - traverseSkeletonGraph', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const combos = generateOptionCombos()
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
    const [lineageColl, starsColl, planetsColl, moonsColl] = ['lineage', 'stars', 'planets', 'moons'].map(
      suffix => db._collection(module.context.collectionName(`test_${suffix}`)))

    const edges = shuffle(lineageColl.all().toArray())
    const vertices = chain([starsColl, planetsColl, moonsColl]).flatMap(coll => coll.all().toArray()).shuffle().value()
    removeFreeEdges(vertices, edges)

    const svid = starsColl.any()._id

    const filteredGraph = buildFilteredGraph(svid, vertices, edges)
    expect(filteredGraph).to.be.an.instanceOf(Object)
    expect(filteredGraph.vertices).to.be.an.instanceOf(Array)
    expect(filteredGraph.edges).to.be.an.instanceOf(Array)

    const vertexCollNames = [starsColl, planetsColl, moonsColl].map(coll => coll.name())
    const cursor = query`
      let vColls = ${vertexCollNames}
    
      for v, e in 0..2
      outbound ${svid}
      ${lineageColl}
      
      prune parse_identifier(v).collection not in vColls
      
      filter parse_identifier(v).collection in vColls
      
      collect aggregate vertices = unique(v), edges = unique(e)

      return {vertices, edges: edges[* filter CURRENT != null]}
    `
    const expectedGraph = cursor.next()
    cursor.dispose()

    expect(filteredGraph.vertices).to.have.deep.members(expectedGraph.vertices)
    expect(filteredGraph.edges).to.have.deep.members(expectedGraph.edges)
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
