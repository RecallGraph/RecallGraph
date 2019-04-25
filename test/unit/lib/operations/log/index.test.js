'use strict'

const { expect } = require('chai')
const { db, query, aql } = require('@arangodb')
const log = require('../../../../../lib/operations/log')
const init = require('../../../../helpers/init')
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers')
const { concat } = require('lodash')
const {
  testUngroupedEvents,
  getRandomGraphPathPattern,
  getNodeBraceSampleIds,
  testGroupedEvents,
  getSampleTestCollNames,
  getOriginKeys
} = require('../../../../helpers/logTestHelpers')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

describe('Log - DB Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const path = '/'
    const allEvents = log(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray()

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
    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleGraphCollNames}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, log)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () =>
    testGroupedEvents('graph', getRandomGraphPathPattern(), log))
})

describe('Log - Collection Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const allEvents = log(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, log)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
        `
    ]

    testGroupedEvents('collection', path, log, queryParts)
  })
})

describe('Log - Node Glob Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const allEvents = log(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e,'_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, log)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
        `
    ]

    testGroupedEvents('nodeGlob', path, log, queryParts)
  })
})

describe('Log - Node Brace Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const allEvents = log(path) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter e.meta._id in ${sampleIds}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(path, allEvents, expectedEvents, log)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta._id in ${sampleIds}
        `
    ]

    testGroupedEvents('nodeBrace', path, log, queryParts)
  })
})
