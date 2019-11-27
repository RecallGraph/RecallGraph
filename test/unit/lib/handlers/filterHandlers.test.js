'use strict'

const init = require('../../../helpers/init')
const { testNodes, filterHandlerWrapper } = require('../../../helpers/history/filter')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getSampleTestCollNames, getNodeBraceSampleIds
} = require('../../../helpers/event')

describe('Filter Handlers - DB Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return filtered nodes in DB scope for the root path',
    () => {
      const path = '/'
      const req = {
        body: {
          path
        }
      }

      for (const timestamp of init.getMilestones()) {
        testNodes(req, path, timestamp, filterHandlerWrapper)
      }
    })
})

describe('Filter Handlers - Graph Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return filtered nodes in Graph scope for a graph path',
    () => {
      const path = getRandomGraphPathPattern()
      const req = {
        body: {
          path
        }
      }

      for (const timestamp of init.getMilestones()) {
        testNodes(req, path, timestamp, filterHandlerWrapper)
      }
    })
})

describe('Filter - Collection Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return filtered nodes in Collection scope for a collection path',
    () => {
      const path = getRandomCollectionPathPattern()
      const req = {
        body: {
          path
        }
      }

      for (const timestamp of init.getMilestones()) {
        testNodes(req, path, timestamp, filterHandlerWrapper)
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
      const req = {
        body: {
          path
        }
      }

      for (const timestamp of init.getMilestones()) {
        testNodes(req, path, timestamp, filterHandlerWrapper)
      }
    })
})

describe('Filter - Node Brace Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return filtered nodes in Node Brace scope for a node-brace path',
    () => {
      const { path } = getNodeBraceSampleIds()
      const req = {
        body: {
          path
        }
      }

      for (const timestamp of init.getMilestones()) {
        testNodes(req, path, timestamp, filterHandlerWrapper)
      }
    })
})
