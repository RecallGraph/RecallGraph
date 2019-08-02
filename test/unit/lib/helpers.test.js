'use strict'

// noinspection NpmUsedModulesInstalled
const { expect } = require('chai')
const init = require('../../helpers/init')
const { snapshotInterval, hash } = require('../../../lib/helpers')
// noinspection NpmUsedModulesInstalled
const { range, uniqueId } = require('lodash')

describe('Helpers - snapshotInterval', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a collection-specific snapshot interval', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const ssInterval = snapshotInterval(collName)

    expect(ssInterval).to.equal(init.TEST_DATA_COLLECTION_SNAPSHPOT_INTERVAL)
  })

  it('should return the default snapshot interval', () => {
    const ssInterval = snapshotInterval('non-existent-collection')
    // noinspection JSUnresolvedVariable
    const defaultSnapshotInterval =
      module.context.service.configuration['snapshot-intervals']._default

    expect(ssInterval).to.equal(defaultSnapshotInterval)
  })
})

describe('Helpers - hash', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a hash of 0 for an empty input, irrespective of radix', () => {
    const radixRange = range(1, 10)
    const input = ''

    radixRange.forEach(radix => {
      const h = hash(input, radix)

      expect(h).to.equal(0)
    })
  })

  it('should return a hash less than radix for a non-empty input', () => {
    const radixRange = range(1, 10)

    radixRange.forEach(radix => {
      const input = uniqueId()

      const h = hash(input, radix)

      expect(h).to.be.within(0, hash - 1)
    })
  })
})
