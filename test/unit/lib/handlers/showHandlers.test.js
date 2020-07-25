'use strict'

const { expect } = require('chai')
const init = require('../../../helpers/util/init')
const {
  testGroupedNodes, testUngroupedNodes, buildNodesFromEventLog, showHandlerQueryWrapper, showHandlerBodyWrapper
} = require('../../../helpers/history/show')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern, getRandomNodeBracePathPattern
} = require('../../../helpers/document')
const { showProvider } = require('../../../../lib/handlers/showHandlers')

describe('Show Handlers - Path as query param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when groupBy  is null',
    () => {
      const path = '/'

      for (const timestamp of init.getMilestones()) {
        const allNodes = showHandlerQueryWrapper(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showHandlerQueryWrapper)
      }
    })

  it('should return grouped nodes in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showHandlerQueryWrapper)
    }
  })

  it('should return ungrouped events in Graph scope for a graph path, when groupBy  is null', () => {
    const path = getRandomGraphPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showHandlerQueryWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showHandlerQueryWrapper)
    }
  })

  it('should return grouped nodes in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showHandlerQueryWrapper)
    }
  })

  it('should return ungrouped events in Collections scope for a collection path, when groupBy  is null', () => {
    const path = getRandomCollectionPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showHandlerQueryWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showHandlerQueryWrapper)
    }
  })

  it('should return grouped nodes in Collection scope for a collection path, when groupBy is specified', () => {
    const path = getRandomCollectionPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showHandlerQueryWrapper)
    }
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when groupBy  is null', () => {
    const path = getRandomNodeGlobPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showHandlerQueryWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showHandlerQueryWrapper)
    }
  })

  it('should return grouped nodes in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const path = getRandomNodeGlobPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showHandlerQueryWrapper)
    }
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when groupBy  is null', () => {
    const path = getRandomNodeBracePathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showHandlerQueryWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showHandlerQueryWrapper)
    }
  })

  it('should return grouped nodes in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const path = getRandomNodeBracePathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showHandlerQueryWrapper)
    }
  })
})

describe('Show Handlers - Path as body param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when groupBy  is null',
    () => {
      const path = '/'

      for (const timestamp of init.getMilestones()) {
        const allNodes = showHandlerBodyWrapper(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showHandlerBodyWrapper)
      }
    })

  it('should return grouped nodes in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showHandlerBodyWrapper)
    }
  })

  it('should return ungrouped events in Graph scope for a graph path, when groupBy  is null', () => {
    const path = getRandomGraphPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showHandlerBodyWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showHandlerBodyWrapper)
    }
  })

  it('should return grouped nodes in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showHandlerBodyWrapper)
    }
  })

  it('should return ungrouped events in Collections scope for a collection path, when groupBy  is null', () => {
    const path = getRandomCollectionPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showHandlerBodyWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showHandlerBodyWrapper)
    }
  })

  it('should return grouped nodes in Collection scope for a collection path, when groupBy is specified', () => {
    const path = getRandomCollectionPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showHandlerBodyWrapper)
    }
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when groupBy  is null', () => {
    const path = getRandomNodeGlobPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showHandlerBodyWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showHandlerBodyWrapper)
    }
  })

  it('should return grouped nodes in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const path = getRandomNodeGlobPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showHandlerBodyWrapper)
    }
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when groupBy  is null', () => {
    const path = getRandomNodeBracePathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showHandlerBodyWrapper(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showHandlerBodyWrapper)
    }
  })

  it('should return grouped nodes in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const path = getRandomNodeBracePathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showHandlerBodyWrapper)
    }
  })
})

describe('Show Provider', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when groupBy  is null',
    () => {
      const path = '/'

      for (const timestamp of init.getMilestones()) {
        const allNodes = showProvider(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showProvider)
      }
    })

  it('should return grouped nodes in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showProvider)
    }
  })

  it('should return ungrouped events in Graph scope for a graph path, when groupBy  is null', () => {
    const path = getRandomGraphPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showProvider(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showProvider)
    }
  })

  it('should return grouped nodes in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showProvider)
    }
  })

  it('should return ungrouped events in Collections scope for a collection path, when groupBy  is null', () => {
    const path = getRandomCollectionPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showProvider(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showProvider)
    }
  })

  it('should return grouped nodes in Collection scope for a collection path, when groupBy is specified', () => {
    const path = getRandomCollectionPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showProvider)
    }
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when groupBy  is null', () => {
    const path = getRandomNodeGlobPathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showProvider(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showProvider)
    }
  })

  it('should return grouped nodes in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const path = getRandomNodeGlobPathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showProvider)
    }
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when groupBy  is null', () => {
    const path = getRandomNodeBracePathPattern()

    for (const timestamp of init.getMilestones()) {
      const allNodes = showProvider(path, timestamp)

      expect(allNodes).to.be.an.instanceOf(Array)

      const expectedNodes = buildNodesFromEventLog(path, timestamp)

      testUngroupedNodes(path, timestamp, allNodes, expectedNodes, showProvider)
    }
  })

  it('should return grouped nodes in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const path = getRandomNodeBracePathPattern()

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes(path, timestamp, showProvider)
    }
  })
})
