'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/util/init')
const {
  testUngroupedNodes, testGroupedNodes, showGetWrapper, showPostWrapper, buildNodesFromEventLog
} = require('../../../../helpers/history/show')
const {
  getRandomGraphPathPattern, getRandomCollNames, getNodeBraceSampleIds, getRandomCollectionPathPattern
} = require('../../../../helpers/event')

const log = require('../../../../../lib/operations/log')

describe('Routes - show (Path as query param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when groupBy  is null, and countsOnly is falsey',
    () => {
      const path = '/'

      for (const timestamp of init.getMilestones()) {
        const allNodes = showGetWrapper(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showGetWrapper)
      }
    })

  it('should return total node count in DB scope for the root path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = '/'

      for (let timestamp of init.getMilestones()) {
        const result = showGetWrapper(path, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Array)
        expect(result).to.have.lengthOf(1)

        const events = log('/', { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result[0].total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showGetWrapper)
    }
  })

  it('should return ungrouped events in Graph scope for a graph path, when groupBy  is null, and countsOnly is' +
     ' falsey', () => {
    const path = getRandomGraphPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showGetWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showGetWrapper)
    }
  })

  it('should return total node count in Graph scope for a graph path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = getRandomGraphPathPattern()

      for (let timestamp of init.getMilestones()) {
        const result = showGetWrapper(path, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Array)
        expect(result).to.have.lengthOf(1)

        const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result[0].total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showGetWrapper)
    }
  })

  it('should return ungrouped events in Collections scope for a collection path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const path = getRandomCollectionPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showGetWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showGetWrapper)
    }
  })

  it('should return total node count in Collection scope for a collection path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const path = getRandomCollectionPathPattern()

    for (let timestamp of init.getMilestones()) {
      const result = showGetWrapper(path, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Array)
      expect(result).to.have.lengthOf(1)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result[0].total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Collection scope for a collection path, when groupBy is specified', () => {
    const path = getRandomCollectionPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showGetWrapper)
    }
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const sampleTestCollNames = getRandomCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`

    for (const timestamp of init.getMilestones()) {
      const allNodes = showGetWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showGetWrapper)
    }
  })

  it('should return total node count in Node Glob scope for a node-glob path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const sampleTestCollNames = getRandomCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`

    for (let timestamp of init.getMilestones()) {
      const result = showGetWrapper(path, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Array)
      expect(result).to.have.lengthOf(1)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result[0].total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getRandomCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showGetWrapper)
    }
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const { path } = getNodeBraceSampleIds(100)

    for (const timestamp of init.getMilestones()) {
      const allNodes = showGetWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showGetWrapper)
    }
  })

  it('should return total node count in Node Brace scope for a node-brace path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const { path } = getNodeBraceSampleIds(100)

    for (let timestamp of init.getMilestones()) {
      const result = showGetWrapper(path, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Array)
      expect(result).to.have.lengthOf(1)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result[0].total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path } = getNodeBraceSampleIds(100)

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showGetWrapper)
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
        const allNodes = showPostWrapper(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showPostWrapper)
      }
    })

  it('should return total node count in DB scope for the root path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = '/'

      for (let timestamp of init.getMilestones()) {
        const result = showPostWrapper(path, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Array)
        expect(result).to.have.lengthOf(1)

        const events = log('/', { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result[0].total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showPostWrapper)
    }
  })

  it('should return ungrouped events in Graph scope for a graph path, when groupBy  is null, and countsOnly is' +
     ' falsey', () => {
    const path = getRandomGraphPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showPostWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showPostWrapper)
    }
  })

  it('should return total node count in Graph scope for a graph path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = getRandomGraphPathPattern()

      for (let timestamp of init.getMilestones()) {
        const result = showPostWrapper(path, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Array)
        expect(result).to.have.lengthOf(1)

        const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result[0].total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showPostWrapper)
    }
  })

  it('should return ungrouped events in Collections scope for a collection path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const path = getRandomCollectionPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showPostWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showPostWrapper)
    }
  })

  it('should return total node count in Collection scope for a collection path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const path = getRandomCollectionPathPattern()

    for (let timestamp of init.getMilestones()) {
      const result = showPostWrapper(path, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Array)
      expect(result).to.have.lengthOf(1)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result[0].total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Collection scope for a collection path, when groupBy is specified', () => {
    const path = getRandomCollectionPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showPostWrapper)
    }
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const sampleTestCollNames = getRandomCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`

    for (const timestamp of init.getMilestones()) {
      const allNodes = showPostWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showPostWrapper)
    }
  })

  it('should return total node count in Node Glob scope for a node-glob path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const sampleTestCollNames = getRandomCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`

    for (let timestamp of init.getMilestones()) {
      const result = showPostWrapper(path, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Array)
      expect(result).to.have.lengthOf(1)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result[0].total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getRandomCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showPostWrapper)
    }
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when groupBy  is null, and' +
     ' countsOnly is falsey', () => {
    const { path } = getNodeBraceSampleIds()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showPostWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showPostWrapper)
    }
  })

  it('should return total node count in Node Brace scope for a node-brace path, when groupBy  is null, and countsOnly' +
     ' is true',
  () => {
    const { path } = getNodeBraceSampleIds()

    for (let timestamp of init.getMilestones()) {
      const result = showPostWrapper(path, timestamp, { countsOnly: true })

      expect(result).to.be.an.instanceOf(Array)
      expect(result).to.have.lengthOf(1)

      const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
      const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

      expect(result[0].total).to.equal(expectedTotal)
    }
  })

  it('should return grouped nodes in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path } = getNodeBraceSampleIds()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showPostWrapper)
    }
  })
})
