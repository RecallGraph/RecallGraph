'use strict'

const { expect } = require('chai')
const { db, aql } = require('@arangodb')
const log = require('../../../../../lib/operations/log')
const init = require('../../../../helpers/util/init')
const { SERVICE_COLLECTIONS } = require('../../../../../lib/constants')
const { concat } = require('lodash')
const {
  testUngroupedEvents, testGroupedEvents, getUngroupedExpectedEvents, getGroupedExpectedEventsQueryParts
} = require('../../../../helpers/event/log')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern, getRandomNodeBracePathPattern
} = require('../../../../helpers/document')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

describe('Log - DB Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const path = '/'
    const allEvents = log(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('db')

    testUngroupedEvents(path, allEvents, expectedEvents, log)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    testGroupedEvents('database', path, log)
  })
})

describe('Log - Graph Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    const allEvents = log(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const sampleDataRefs = init.getSampleDataRefs()
    const sampleGraphCollNames = concat(
      sampleDataRefs.vertexCollections,
      sampleDataRefs.edgeCollections
    )
    const expectedEvents = getUngroupedExpectedEvents('graph', { collNames: sampleGraphCollNames })

    testUngroupedEvents(path, allEvents, expectedEvents, log)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () =>
    testGroupedEvents('graph', getRandomGraphPathPattern(), log))
})

describe('Log - Collection Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const allEvents = log(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('collection', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, log)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('collection', { pattern })

    testGroupedEvents('collection', path, log, queryParts)
  })
})

describe('Log - Node Glob Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const allEvents = log(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('node-glob', { pattern })

    testUngroupedEvents(path, allEvents, expectedEvents, log)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const queryParts = getGroupedExpectedEventsQueryParts('node-glob', { pattern })

    testGroupedEvents('nodeGlob', path, log, queryParts)
  })
})

describe('Log - Node Brace Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const allEvents = log(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = getUngroupedExpectedEvents('node-brace', { nids })

    testUngroupedEvents(path, allEvents, expectedEvents, log)
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

    testGroupedEvents('nodeBrace', path, log, queryParts)
  })
})
