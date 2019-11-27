'use strict'

const init = require('../../../../helpers/init')
const { testNodes, filterPostWrapper } = require('../../../../helpers/history/filter')
const {
  getRandomGraphPathPattern,
  getSampleTestCollNames,
  getNodeBraceSampleIds,
  getRandomCollectionPathPattern
} = require('../../../../helpers/event')

describe('Routes - filter', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return filtered nodes in DB scope for the root path',
    () => {
      const path = '/'
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      for (const timestamp of init.getMilestones()) {
        testNodes(reqParams, path, timestamp, filterPostWrapper)
      }
    })

  it('should return filtered nodes in Graph scope for a graph path',
    () => {
      const path = getRandomGraphPathPattern()
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      for (const timestamp of init.getMilestones()) {
        testNodes(reqParams, path, timestamp, filterPostWrapper)
      }
    })

  it('should return filtered nodes in Collection scope for a collection path',
    () => {
      const path = getRandomCollectionPathPattern()
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      for (const timestamp of init.getMilestones()) {
        testNodes(reqParams, path, timestamp, filterPostWrapper)
      }
    })

  it('should return filtered nodes in Node Glob scope for a node-glob path',
    () => {
      const sampleTestCollNames = getSampleTestCollNames()
      const path =
        sampleTestCollNames.length > 1
          ? `/ng/{${sampleTestCollNames}}/*`
          : `/ng/${sampleTestCollNames}/*`
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      for (const timestamp of init.getMilestones()) {
        testNodes(reqParams, path, timestamp, filterPostWrapper)
      }
    })

  it('should return filtered nodes in Node Brace scope for a node-brace path',
    () => {
      const { path } = getNodeBraceSampleIds()
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      for (const timestamp of init.getMilestones()) {
        testNodes(reqParams, path, timestamp, filterPostWrapper)
      }
    })
})
