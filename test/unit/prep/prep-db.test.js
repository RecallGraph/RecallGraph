'use strict'

const { expect } = require('chai')
const init = require('../../helpers/util/init')
const { db } = require('@arangodb')
const { chain, forEach } = require('lodash')
const { SERVICE_COLLECTIONS } = require('../../../lib/constants')

describe('Prep - Clean Data', () => {
  before(() => init.setup({ forceInit: true }))

  after(init.teardown)

  /*
   beforeEach(function() {
   console.debug('beforeEach', this.currentTest.fullTitle())
   })
   afterEach(function(){
   console.log('afterEach', this.currentTest.fullTitle(), this.currentTest.state)
   });
   */

  it('should have no documents in test data collections', () => {
    forEach(init.TEST_DATA_COLLECTIONS, collName => {
      const coll = db._collection(collName)

      expect(coll.count()).to.equal(0)
    })
  })

  it('should have no documents in service collections', () => {
    forEach(SERVICE_COLLECTIONS, collName => {
      const coll = db._collection(collName)

      expect(coll.count()).to.equal(0)
    })
  })
})

describe('Prep - Load Sample Data', () => {
  before(() => init.setup({ forceInit: true, ensureSampleDataLoad: true }))

  after(init.teardown)

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

  it('should have non-zero document count in service collections', () => {
    forEach(SERVICE_COLLECTIONS, collName => {
      const coll = db._collection(collName)

      expect(coll.count()).to.above(0)
    })
  })
})

describe('Prep - Load Flight Data', () => {
  before(() => init.setup({ forceInit: true, ensureFlightDataLoad: true }))

  after(init.teardown)

  it('should have non-zero document count in flight data collections', () => {
    forEach(init.getFlightDataRefs().collections, collName => {
      const coll = db._collection(collName)

      expect(coll.count()).to.above(0)
    })
  })

  it('should have non-zero document count in service collections', () => {
    forEach(SERVICE_COLLECTIONS, collName => {
      const coll = db._collection(collName)

      expect(coll.count()).to.above(0)
    })
  })
})
