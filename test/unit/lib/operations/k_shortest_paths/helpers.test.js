/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/util/init')
const { db, query } = require('@arangodb')
const {
  buildFilteredPaths, removeFreeEdges
} = require('../../../../../lib/operations/traverse/helpers')
const { shuffle, chain } = require('lodash')

describe('k Shortest Paths Helpers - buildPaths', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return a connected graph from the provided vertex and edge sets, given a start vertex', () => {
    const [lineageColl, starsColl, planetsColl, moonsColl] = ['lineage', 'stars', 'planets', 'moons'].map(
      suffix => db._collection(module.context.collectionName(`test_${suffix}`)))

    const edges = shuffle(lineageColl.all().toArray())
    const vertices = chain([starsColl, planetsColl, moonsColl]).flatMap(coll => coll.all().toArray()).shuffle().value()
    removeFreeEdges(vertices, edges)

    const svid = starsColl.any()._id

    const filteredGraph = buildFilteredPaths(svid, vertices, edges)
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
