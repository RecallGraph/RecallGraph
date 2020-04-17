'use strict'

const { expect } = require('chai')
const init = require('../../helpers/init')
const { db } = require('@arangodb')
const { chain } = require('lodash')

describe('Prep - Clean', () => {
  before(() => init.setup({ ensureSampleDataLoad: false, forceTruncateTestData: true, forceTruncateService: true }))
  after(init.teardown)
  /*
   beforeEach(function() {
   console.debug('beforeEach', this.currentTest.fullTitle())
   })
   afterEach(function(){
   console.log('afterEach', this.currentTest.fullTitle(), this.currentTest.state)
   });
   */

  it('should have no documents in test_vertex and test_edge collections', () => {
    const { vertex: vertexCollName, edge: edgeCollName } = init.TEST_DATA_COLLECTIONS
    const vertexColl = db._collection(vertexCollName)
    const edgeColl = db._collection(edgeCollName)

    expect(vertexColl.count()).to.equal(0)
    expect(edgeColl.count()).to.equal(0)
  })

  it('should have zero document count in sample data collections', () => {
    chain(init.getSampleDataRefs())
      .pick('vertexCollections', 'edgeCollections')
      .values()
      .flatten()
      .forEach(collName => {
        const coll = db._collection(collName)

        expect(coll.count()).to.equal(0)
      })
  })
})

describe('Prep - Load', () => {
  before(() => init.setup({ ensureSampleDataLoad: true, forceTruncateTestData: true, forceTruncateService: true }))

  after(init.teardown)

  it('should have no documents in test_vertex and test_edge collections', () => {
    const { vertex: vertexCollName, edge: edgeCollName } = init.TEST_DATA_COLLECTIONS
    const vertexColl = db._collection(vertexCollName)
    const edgeColl = db._collection(edgeCollName)

    expect(vertexColl.count()).to.equal(0)
    expect(edgeColl.count()).to.equal(0)
  })

  it('should have non-zero document count in sample data collections', () => {
    chain(init.getSampleDataRefs())
      .pick('vertexCollections', 'edgeCollections')
      .values()
      .flatten()
      .forEach(collName => {
        const coll = db._collection(collName)

        expect(coll.count()).to.be.above(0)
      })
  })
})
