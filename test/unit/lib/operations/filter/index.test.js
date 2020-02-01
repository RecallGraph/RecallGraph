'use strict'

const init = require('../../../../helpers/init')
const { testNodes } = require('../../../../helpers/history/filter')
const filter = require('../../../../../lib/operations/filter')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getSampleTestCollNames, getNodeBraceSampleIds
} = require('../../../../helpers/event')

describe('Filter - DB Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return filtered nodes in DB scope for the root path',
    () => {
      const path = '/'

      for (const timestamp of init.getMilestones()) {
        testNodes(path, path, timestamp, filter)
      }
    })
})

describe('Filter - Graph Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return filtered nodes in Graph scope for a graph path',
    () => {
      const path = getRandomGraphPathPattern()

      for (const timestamp of init.getMilestones()) {
        testNodes(path, path, timestamp, filter)
      }
    })
})

describe('Filter - Collection Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return filtered nodes in Collection scope for a collection path',
    () => {
      const path = getRandomCollectionPathPattern()

      for (const timestamp of init.getMilestones()) {
        testNodes(path, path, timestamp, filter)
      }
    })
})

describe('Filter - Node Glob Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return filtered nodes in Node Glob scope for a node-glob path',
    () => {
      const sampleTestCollNames = getSampleTestCollNames()
      const path =
        sampleTestCollNames.length > 1
          ? `/ng/{${sampleTestCollNames}}/*`
          : `/ng/${sampleTestCollNames}/*`

      for (const timestamp of init.getMilestones()) {
        testNodes(path, path, timestamp, filter)
      }
    })
})

describe('Filter - Node Brace Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return filtered nodes in Node Brace scope for a node-brace path',
    () => {
      const { path } = getNodeBraceSampleIds()

      for (const timestamp of init.getMilestones()) {
        testNodes(path, path, timestamp, filter)
      }
    })
})
