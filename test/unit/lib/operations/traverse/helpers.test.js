'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/util/init')
const {
  testTraverseSkeletonGraphWithParams, generateOptionCombos, generateCombos, traverse
} = require('../../../../helpers/history/traverse')
const { createNodeBracepath, getEnds, buildFilteredPaths } = require('../../../../../lib/operations/traverse/helpers')
const { db } = require('@arangodb')
const { sample, last, map, omit, zipObject } = require('lodash')
const { generateFilters, cartesian } = require('../../../../helpers/util')

const lineageCollName = module.context.collectionName('test_lineage')

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

describe('Traverse Helpers - buildFilteredPaths', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return a connected graph from the provided vertex and edge sets, given a start vertex', () => {
    const vertexCollNames = init.getSampleDataRefs().vertexCollections
    const cy = last(init.getSampleDataRefs().cyGraphs.milestones)
    const vertices = cy.nodes().map(v => omit(v.data(), 'id'))
    const edges = cy.edges().map(e => omit(e.data(), 'id', 'source', 'target'))
    const built = {
      vertices: zipObject(map(vertices, '_id'), vertices.map(v => omit(v, 'coll'))),
      edges: zipObject(map(edges, '_id'), edges.map(e => omit(e, 'coll')))
    }

    const combos = generateCombos(['minDepth', 'relDepth'])
    combos.forEach(combo => {
      const { minDepth, relDepth } = combo
      const maxDepth = minDepth + relDepth
      const svColl = db._collection(sample(vertexCollNames))
      const svid = svColl.any()._id

      const unfilteredNodeGroups = traverse(cy, svid, minDepth, maxDepth, false, 'path', 'path', {
        [lineageCollName]: 'any'
      })
      const vFilter = [null, generateFilters(unfilteredNodeGroups.vertices)]
      const eFilter = [null, generateFilters(unfilteredNodeGroups.edges)]
      const pFilter = [null, generateFilters(unfilteredNodeGroups.paths)]

      const filterCombos = cartesian({ vFilter, eFilter, pFilter })
      filterCombos.forEach(filterCombo => {
        const { vFilter, eFilter, pFilter } = filterCombo
        const filteredNodeGroups = traverse(cy, svid, minDepth, maxDepth, false, 'path', 'path', {
          [lineageCollName]: 'any'
        }, vFilter, eFilter, pFilter)
        const skelPaths = filteredNodeGroups.paths.map(path => {
          const skelPath = {
            vertices: map(path.vertices, '_id')
          }

          if (path.edges.length) {
            skelPath.edges = map(path.edges, '_id')
          }

          return skelPath
        })

        const paths = buildFilteredPaths(skelPaths, built, vFilter, eFilter, pFilter)

        const params = JSON.stringify(Object.assign({}, combo, filterCombo))
        expect(paths, params).to.deep.equal(filteredNodeGroups.paths)
      })
    })
  })
})
