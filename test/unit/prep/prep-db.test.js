'use strict'

// noinspection NpmUsedModulesInstalled
const { expect } = require('chai')
const init = require('../../helpers/init')
// noinspection NpmUsedModulesInstalled
const { db } = require('@arangodb')
const { SERVICE_COLLECTIONS } = require('../../../lib/helpers')
// noinspection NpmUsedModulesInstalled
const { values, chain } = require('lodash')

describe('Prep - clean and load', () => {
  before(() => init.setup({ ensureSampleDataLoad: true, forceTruncateTestData: true, forceTruncateService: true }))

  after(init.teardown)

  it('should have no documents in test_vertex and test_edge collections', () => {
    const { vertex: vertexCollName, edge: edgeCollName } = init.TEST_DATA_COLLECTIONS
    const vertexColl = db._collection(vertexCollName)
    const edgeColl = db._collection(edgeCollName)

    // coll.count() sometimes gives stale results for unknown reasons.
    expect(vertexColl.all().toArray().length).to.equal(0)
    expect(edgeColl.all().toArray().length).to.equal(0)
  })

  it('should have no documents in service collections', () => {
    values(SERVICE_COLLECTIONS).forEach(collName => {
      const coll = db._collection(collName)

      expect(coll.all().toArray().length).to.be.above(0)
    })
  })

  it('should have non-zero document count in sample data collections', () => {
    chain(init.getSampleDataRefs())
      .pick('vertexCollections', 'edgeCollections')
      .values()
      .flatten()
      .forEach(collName => {
        const coll = db._collection(collName)

        expect(coll.all().toArray().length).to.be.above(0)
      })
  })
})
