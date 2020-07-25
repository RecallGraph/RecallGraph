'use strict'

const { expect } = require('chai')
const init = require('../../../helpers/util/init')
const { SERVICE_COLLECTIONS } = require('../../../../lib/constants')
const {
  testUngroupedEvents, testGroupedEvents, logHandlerQueryWrapper, logHandlerBodyWrapper, getUngroupedExpectedEvents,
  getGroupedExpectedEventsQueryParts
} = require('../../../helpers/event/log')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern, getRandomNodeBracePathPattern
} = require('../../../helpers/document')
const { db, aql } = require('@arangodb')
const { logProvider } = require('../../../../lib/handlers/logHandlers')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

describe('Log Handlers - Path as query param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const path = '/'
    const allEvents = logHandlerQueryWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('db')

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerQueryWrapper)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    testGroupedEvents('database', path, logHandlerQueryWrapper)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    const allEvents = logHandlerQueryWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const sampleDataRefs = init.getSampleDataRefs()
    const sampleGraphCollNames = sampleDataRefs.vertexCollections.concat(sampleDataRefs.edgeCollections)
    const expectedEvents = getUngroupedExpectedEvents('graph', { collNames: sampleGraphCollNames })

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerQueryWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    return testGroupedEvents('graph', path, logHandlerQueryWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const allEvents = logHandlerQueryWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('collection', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerQueryWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('collection', { pattern })

    testGroupedEvents('collection', path, logHandlerQueryWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const allEvents = logHandlerQueryWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)
    const expectedEvents = getUngroupedExpectedEvents('node-glob', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerQueryWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('node-glob', { pattern })

    testGroupedEvents('nodeGlob', path, logHandlerQueryWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const allEvents = logHandlerQueryWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('node-brace', { nids })

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerQueryWrapper)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.meta.id in ${nids}
        `
    ]

    testGroupedEvents('nodeBrace', path, logHandlerQueryWrapper, queryParts)
  })
})

describe('Log Handlers - Path as body param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const path = '/'
    const allEvents = logHandlerBodyWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('db')

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerBodyWrapper)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    testGroupedEvents('database', path, logHandlerBodyWrapper)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const path = getRandomGraphPathPattern()
    const allEvents = logHandlerBodyWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const sampleDataRefs = init.getSampleDataRefs()
    const sampleGraphCollNames = sampleDataRefs.vertexCollections.concat(sampleDataRefs.edgeCollections)
    const expectedEvents = getUngroupedExpectedEvents('graph', { collNames: sampleGraphCollNames })

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerBodyWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    return testGroupedEvents('graph', path, logHandlerBodyWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const allEvents = logHandlerBodyWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('collection', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerBodyWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('collection', { pattern })

    testGroupedEvents('collection', path, logHandlerBodyWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const allEvents = logHandlerBodyWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)
    const expectedEvents = getUngroupedExpectedEvents('node-glob', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerBodyWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('node-glob', { pattern })

    testGroupedEvents('nodeGlob', path, logHandlerBodyWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const allEvents = logHandlerBodyWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('node-brace', { nids })

    testUngroupedEvents(path, allEvents, expectedEvents, logHandlerBodyWrapper)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.meta.id in ${nids}
        `
    ]

    testGroupedEvents('nodeBrace', path, logHandlerBodyWrapper, queryParts)
  })
})

describe('Log Provider', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const path = '/'
    const allEvents = logProvider(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('db')

    testUngroupedEvents(path, allEvents, expectedEvents, logProvider)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    testGroupedEvents('database', path, logProvider)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const path = getRandomGraphPathPattern()
    const allEvents = logProvider(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const sampleDataRefs = init.getSampleDataRefs()
    const sampleGraphCollNames = sampleDataRefs.vertexCollections.concat(sampleDataRefs.edgeCollections)
    const expectedEvents = getUngroupedExpectedEvents('graph', { collNames: sampleGraphCollNames })

    testUngroupedEvents(path, allEvents, expectedEvents, logProvider)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    return testGroupedEvents('graph', path, logProvider)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const allEvents = logProvider(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('collection', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, logProvider)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('collection', { pattern })

    testGroupedEvents('collection', path, logProvider, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const allEvents = logProvider(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)
    const expectedEvents = getUngroupedExpectedEvents('node-glob', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, logProvider)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('node-glob', { pattern })

    testGroupedEvents('nodeGlob', path, logProvider, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const allEvents = logProvider(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('node-brace', { nids })

    testUngroupedEvents(path, allEvents, expectedEvents, logProvider)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.meta.id in ${nids}
        `
    ]

    testGroupedEvents('nodeBrace', path, logProvider, queryParts)
  })
})
