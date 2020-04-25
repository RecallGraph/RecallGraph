'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/util/init')
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers')
const {
  testUngroupedEvents,
  testGroupedEvents,
  logGetWrapper,
  logPostWrapper
} = require('../../../../helpers/event/log')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern, getRandomNodeBracePathPattern
} = require('../../../../helpers/document')

const { db, query, aql } = require('@arangodb')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

describe('Routes - log (Path as query param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const path = '/'
    const allEvents = logGetWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter !(e['is-origin-node'] || e['is-super-origin-node'])
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return e
      `.toArray()

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
    const expectedEvents = query`
        for e in ${eventColl}
          filter !(e['is-origin-node'] || e['is-super-origin-node'])
          filter parse_identifier(e.meta.id).collection in ${sampleGraphCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return e
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    testGroupedEvents('graph', path, logGetWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const { path, collNames } = getRandomCollectionPathPattern(true)
    const allEvents = logGetWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter !(e['is-origin-node'] || e['is-super-origin-node'])
          filter parse_identifier(e.meta.id).collection in ${collNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return e
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const { path, collNames } = getRandomCollectionPathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.collection in ${collNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('collection', path, logGetWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const { path, collNames } = getRandomNodeGlobPathPattern(true)
    const allEvents = logGetWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter !(e['is-origin-node'] || e['is-super-origin-node'])
          filter parse_identifier(e.meta.id).collection in ${collNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return e
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const { path, collNames } = getRandomNodeGlobPathPattern(true)
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter !v['is-origin-node']
        filter v.collection in ${collNames}
        for e in ${commandColl}
        filter e._to == v._id
      `
    ]

    testGroupedEvents('nodeGlob', path, logGetWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const allEvents = logGetWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter !(e['is-origin-node'] || e['is-super-origin-node'])
          filter e.meta.id in ${nids}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return e
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.meta.id in ${nids}
          for e in ${commandColl}
          filter e._to == v._id
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

    const expectedEvents = query`
        for e in ${eventColl}
          filter !(e['is-origin-node'] || e['is-super-origin-node'])
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return e
      `.toArray()

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
    const expectedEvents = query`
        for e in ${eventColl}
          filter !(e['is-origin-node'] || e['is-super-origin-node'])
          filter parse_identifier(e.meta.id).collection in ${sampleGraphCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return e
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const path = getRandomGraphPathPattern()

    return testGroupedEvents('graph', path, logPostWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const { path, collNames } = getRandomNodeGlobPathPattern(true)
    const allEvents = logPostWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter !(e['is-origin-node'] || e['is-super-origin-node'])
          filter parse_identifier(e.meta.id).collection in ${collNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return e
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const { path, collNames } = getRandomNodeGlobPathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.collection in ${collNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('collection', path, logPostWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const { path, collNames } = getRandomCollectionPathPattern(true)
    const allEvents = logPostWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)
    const expectedEvents = query`
        for e in ${eventColl}
          filter !(e['is-origin-node'] || e['is-super-origin-node'])
          filter parse_identifier(e.meta.id).collection in ${collNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return e
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const { path, collNames } = getRandomCollectionPathPattern(true)
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter !v['is-origin-node']
        filter v.collection in ${collNames}
        for e in ${commandColl}
        filter e._to == v._id
      `
    ]

    testGroupedEvents('nodeGlob', path, logPostWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const allEvents = logPostWrapper(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter !(e['is-origin-node'] || e['is-super-origin-node'])
          filter e.meta.id in ${nids}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return e
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.meta.id in ${nids}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('nodeBrace', path, logPostWrapper, queryParts)
  })
})
