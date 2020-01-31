'use strict'

const { expect } = require('chai')
const show = require('../../../../../lib/operations/show')
const init = require('../../../../helpers/init')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getSampleTestCollNames, getNodeBraceSampleIds
} = require('../../../../helpers/event')
const log = require('../../../../../lib/operations/log')
const {
  testUngroupedNodes, testGroupedNodes, buildNodesFromEventLog
} = require('../../../../helpers/history/show')

describe('Show - DB Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped nodes in DB scope for the root path, when groupBy  is null, and countsOnly is falsey',
    () => {
      const path = '/'

      for (const timestamp of init.getMilestones()) {
        const allNodes = show(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, show)
      }
    })

  it('should return total node count in DB scope for the root path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = '/'

      for (let timestamp of init.getMilestones()) {
        const result = show(path, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Object)

        const events = log('/', { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result.total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, path, timestamp, show)
    }
  })
})

describe('Show - Graph Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped nodes in Graph scope for a graph path, when groupBy  is null, and countsOnly is falsey',
    () => {
      const path = getRandomGraphPathPattern()

      for (let timestamp of init.getMilestones()) {
        const allNodes = show(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, show)
      }
    })

  it('should return total node count in Graph scope for a graph path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = getRandomGraphPathPattern()

      for (let timestamp of init.getMilestones()) {
        const result = show(path, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Object)

        const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result.total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, path, timestamp, show)
    }
  })
})

describe('Show - Collection Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it(
    'should return ungrouped nodes in Collection scope for a collection path, when groupBy  is null, and countsOnly is falsey',
    () => {
      const path = getRandomCollectionPathPattern()

      for (let timestamp of init.getMilestones()) {
        const allNodes = show(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, show)
      }
    })

  it(
    'should return total node count in Collection scope for a collection path, when groupBy  is null, and countsOnly is true',
    () => {
      const path = getRandomCollectionPathPattern()

      for (let timestamp of init.getMilestones()) {
        const result = show(path, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Object)

        const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result.total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in Collection scope for a collection path, when groupBy is specified', () => {
    const path = getRandomCollectionPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, path, timestamp, show)
    }
  })
})

describe('Show - Node Glob Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it(
    'should return ungrouped nodes in Node Glob scope for a node-glob path, when groupBy  is null, and countsOnly is falsey',
    () => {
      const sampleTestCollNames = getSampleTestCollNames()
      const path =
        sampleTestCollNames.length > 1
          ? `/ng/{${sampleTestCollNames}}/*`
          : `/ng/${sampleTestCollNames}/*`

      for (let timestamp of init.getMilestones()) {
        const allNodes = show(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, show)
      }
    })

  it(
    'should return total node count in Node Glob scope for a node-glob path, when groupBy  is null, and countsOnly is true',
    () => {
      const sampleTestCollNames = getSampleTestCollNames()
      const path =
        sampleTestCollNames.length > 1
          ? `/ng/{${sampleTestCollNames}}/*`
          : `/ng/${sampleTestCollNames}/*`

      for (let timestamp of init.getMilestones()) {
        const result = show(path, timestamp, { countsOnly: true })

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

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, path, timestamp, show)
    }
  })
})

describe('Show - Node Brace Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it(
    'should return ungrouped nodes in Node Brace scope for a node-brace path, when groupBy  is null, and countsOnly is falsey',
    () => {
      const { path } = getNodeBraceSampleIds()

      for (let timestamp of init.getMilestones()) {
        const allNodes = show(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, show)
      }
    })

  it(
    'should return total node count in Node Brace scope for a node-brace path, when groupBy  is null, and countsOnly is true',
    () => {
      const { path } = getNodeBraceSampleIds()

      for (let timestamp of init.getMilestones()) {
        const result = show(path, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Object)

        const events = log(path, { until: timestamp, groupBy: 'node', groupLimit: 1 })
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        expect(result.total).to.equal(expectedTotal)
      }
    })

  it('should return grouped nodes in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path } = getNodeBraceSampleIds()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, path, timestamp, show)
    }
  })
})
