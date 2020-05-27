'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/util/init')
const { SERVICE_COLLECTIONS } = require('../../../../../lib/constants')
const {
  testUngroupedEvents, testGroupedEvents, logGetWrapper, logPostWrapper, getUngroupedExpectedEvents,
  getGroupedExpectedEventsQueryParts
} = require('../../../../helpers/event/log')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern, getRandomNodeBracePathPattern
} = require('../../../../helpers/document')

const { db, aql } = require('@arangodb')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

describe('Routes - log (Path as query param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const path = '/'
    const allEvents = logGetWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('db')

    testUngroupedEvents(path, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    testGroupedEvents('database', path, logGetWrapper)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const path = getRandomGraphPathPattern()
    const allEvents = logGetWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const sampleDataRefs = init.getSampleDataRefs()
    const sampleGraphCollNames = sampleDataRefs.vertexCollections.concat(sampleDataRefs.edgeCollections)
    const expectedEvents = getUngroupedExpectedEvents('graph', { collNames: sampleGraphCollNames })

    testUngroupedEvents(path, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    testGroupedEvents('graph', path, logGetWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)

    const allEvents = logGetWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('collection', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('collection', { pattern })

    testGroupedEvents('collection', path, logGetWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const allEvents = logGetWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('node-glob', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('node-glob', { pattern })

    testGroupedEvents('nodeGlob', path, logGetWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const allEvents = logGetWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('node-brace', { nids })

    testUngroupedEvents(path, allEvents, expectedEvents, logGetWrapper)
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

    testGroupedEvents('nodeBrace', path, logGetWrapper, queryParts)
  })
})

describe('Routes - log (Path as body param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const path = '/'
    const allEvents = logPostWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('db')

    testUngroupedEvents(path, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    testGroupedEvents('database', path, logPostWrapper)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const path = getRandomGraphPathPattern()
    const allEvents = logPostWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const sampleDataRefs = init.getSampleDataRefs()
    const sampleGraphCollNames = sampleDataRefs.vertexCollections.concat(sampleDataRefs.edgeCollections)
    const expectedEvents = getUngroupedExpectedEvents('graph', { collNames: sampleGraphCollNames })

    testUngroupedEvents(path, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    return testGroupedEvents('graph', path, logPostWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    console.debug({ path, pattern })

    const allEvents = logPostWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('collection', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('collection', { pattern })

    testGroupedEvents('collection', path, logPostWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const allEvents = logPostWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)
    const expectedEvents = getUngroupedExpectedEvents('node-glob', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('node-glob', { pattern })

    testGroupedEvents('nodeGlob', path, logPostWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const allEvents = logPostWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('node-brace', { nids })

    testUngroupedEvents(path, allEvents, expectedEvents, logPostWrapper)
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

    testGroupedEvents('nodeBrace', path, logPostWrapper, queryParts)
  })
})
