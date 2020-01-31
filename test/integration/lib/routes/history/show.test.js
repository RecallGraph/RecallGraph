'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/init')
const {
  testUngroupedNodes, testGroupedNodes, showGetWrapper, showPostWrapper, buildNodesFromEventLog
} = require('../../../../helpers/history/show')
const {
  getRandomGraphPathPattern, getSampleTestCollNames, getNodeBraceSampleIds, getRandomCollectionPathPattern
} = require('../../../../helpers/event')

const log = require('../../../../../lib/operations/log')

describe('Routes - show (Path as query param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when groupBy  is null, and countsOnly is falsey',
    () => {
      const path = '/'

      for (const timestamp of init.getMilestones()) {
        const reqParams = {
          json: true,
          qs: {
            path
          }
        }

        const allNodes = showGetWrapper(reqParams, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(reqParams, timestamp, allNodes, expectedNodes, showGetWrapper)
      }
    })

  it('should return total node count in DB scope for the root path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = '/'
      const reqParams = {
        json: true,
        qs: {
          path
        }
      }

      for (let timestamp of init.getMilestones()) {
        const result = showGetWrapper(reqParams, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Object)

        const events = log('/', { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result.total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'
    const reqParams = {
      json: true,
      qs: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(reqParams, path, timestamp, showGetWrapper)
    }
  })

  it('should return ungrouped events in Graph scope for a graph path, when groupBy  is null, and countsOnly is' +
     ' falsey', () => {
    const path = getRandomGraphPathPattern()

    for (const timestamp of init.getMilestones()) {
      const reqParams = {
        json: true,
        qs: {
          path
        }
      }

      const allNodes = showGetWrapper(reqParams, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(reqParams, timestamp, allNodes, expectedNodes, showGetWrapper)
    }
  })

  it('should return total node count in Graph scope for a graph path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = getRandomGraphPathPattern()
      const reqParams = {
        json: true,
        qs: {
          path
        }
      }

      for (let timestamp of init.getMilestones()) {
        const result = showGetWrapper(reqParams, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Object)

        const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result.total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()
    const reqParams = {
      json: true,
      qs: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(reqParams, path, timestamp, showGetWrapper)
    }
  })

  it('should return ungrouped events in Collections scope for a collection path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const path = getRandomCollectionPathPattern()

    for (const timestamp of init.getMilestones()) {
      const reqParams = {
        json: true,
        qs: {
          path
        }
      }

      const allNodes = showGetWrapper(reqParams, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(reqParams, timestamp, allNodes, expectedNodes, showGetWrapper)
    }
  })

  it('should return total node count in Collection scope for a collection path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const path = getRandomCollectionPathPattern()
    const reqParams = {
      json: true,
      qs: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      const result = showGetWrapper(reqParams, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Object)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result.total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Collection scope for a collection path, when groupBy is specified', () => {
    const path = getRandomCollectionPathPattern()
    const reqParams = {
      json: true,
      qs: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(reqParams, path, timestamp, showGetWrapper)
    }
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`

    for (const timestamp of init.getMilestones()) {
      const reqParams = {
        json: true,
        qs: {
          path
        }
      }

      const allNodes = showGetWrapper(reqParams, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(reqParams, timestamp, allNodes, expectedNodes, showGetWrapper)
    }
  })

  it('should return total node count in Node Glob scope for a node-glob path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
        sampleTestCollNames.length > 1
          ? `/ng/{${sampleTestCollNames}}/*`
          : `/ng/${sampleTestCollNames}/*`
    const reqParams = {
      json: true,
      qs: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      const result = showGetWrapper(reqParams, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Object)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result.total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const reqParams = {
      json: true,
      qs: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(reqParams, path, timestamp, showGetWrapper)
    }
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const { path } = getNodeBraceSampleIds(100)

    for (const timestamp of init.getMilestones()) {
      const reqParams = {
        json: true,
        qs: {
          path
        }
      }

      const allNodes = showGetWrapper(reqParams, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(reqParams, timestamp, allNodes, expectedNodes, showGetWrapper)
    }
  })

  it('should return total node count in Node Brace scope for a node-brace path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const { path } = getNodeBraceSampleIds(100)
    const reqParams = {
      json: true,
      qs: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      const result = showGetWrapper(reqParams, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Object)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result.total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path } = getNodeBraceSampleIds(100)
    const reqParams = {
      json: true,
      qs: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(reqParams, path, timestamp, showGetWrapper)
    }
  })
})

describe('Routes - show (Path as body param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when groupBy  is null, and countsOnly is falsey',
    () => {
      const path = '/'

      for (const timestamp of init.getMilestones()) {
        const reqParams = {
          json: true,
          body: {
            path
          }
        }

        const allNodes = showPostWrapper(reqParams, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(reqParams, timestamp, allNodes, expectedNodes, showPostWrapper)
      }
    })

  it('should return total node count in DB scope for the root path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = '/'
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      for (let timestamp of init.getMilestones()) {
        const result = showPostWrapper(reqParams, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Object)

        const events = log('/', { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result.total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'
    const reqParams = {
      json: true,
      body: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(reqParams, path, timestamp, showPostWrapper)
    }
  })

  it('should return ungrouped events in Graph scope for a graph path, when groupBy  is null, and countsOnly is' +
     ' falsey', () => {
    const path = getRandomGraphPathPattern()

    for (const timestamp of init.getMilestones()) {
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      const allNodes = showPostWrapper(reqParams, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(reqParams, timestamp, allNodes, expectedNodes, showPostWrapper)
    }
  })

  it('should return total node count in Graph scope for a graph path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = getRandomGraphPathPattern()
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      for (let timestamp of init.getMilestones()) {
        const result = showPostWrapper(reqParams, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Object)

        const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result.total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()
    const reqParams = {
      json: true,
      body: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(reqParams, path, timestamp, showPostWrapper)
    }
  })

  it('should return ungrouped events in Collections scope for a collection path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const path = getRandomCollectionPathPattern()

    for (const timestamp of init.getMilestones()) {
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      const allNodes = showPostWrapper(reqParams, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(reqParams, timestamp, allNodes, expectedNodes, showPostWrapper)
    }
  })

  it('should return total node count in Collection scope for a collection path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const path = getRandomCollectionPathPattern()
    const reqParams = {
      json: true,
      body: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      const result = showPostWrapper(reqParams, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Object)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result.total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Collection scope for a collection path, when groupBy is specified', () => {
    const path = getRandomCollectionPathPattern()
    const reqParams = {
      json: true,
      body: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(reqParams, path, timestamp, showPostWrapper)
    }
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`

    for (const timestamp of init.getMilestones()) {
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      const allNodes = showPostWrapper(reqParams, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(reqParams, timestamp, allNodes, expectedNodes, showPostWrapper)
    }
  })

  it('should return total node count in Node Glob scope for a node-glob path, when groupBy  is null, and countsOnly' +
     ' is true',
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

    for (let timestamp of init.getMilestones()) {
      const result = showPostWrapper(reqParams, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Object)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result.total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Node Glob scope for a node-glob path, when groupBy is specified', () => {
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

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(reqParams, path, timestamp, showPostWrapper)
    }
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const { path } = getNodeBraceSampleIds()

    for (const timestamp of init.getMilestones()) {
      const reqParams = {
        json: true,
        body: {
          path
        }
      }

      const allNodes = showPostWrapper(reqParams, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(reqParams, timestamp, allNodes, expectedNodes, showPostWrapper)
    }
  })

  it('should return total node count in Node Brace scope for a node-brace path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const { path } = getNodeBraceSampleIds()
    const reqParams = {
      json: true,
      body: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      const result = showPostWrapper(reqParams, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Object)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result.total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path } = getNodeBraceSampleIds()
    const reqParams = {
      json: true,
      body: {
        path
      }
    }

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(reqParams, path, timestamp, showPostWrapper)
    }
  })
})
