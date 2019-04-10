'use strict'

const { expect } = require('chai')
const init = require('../../../helpers/init')
const { log } = require('../../../../lib/handlers/logHandlers')
const { SERVICE_COLLECTIONS } = require('../../../../lib/helpers')
const {
  getOriginKeys,
  testUngroupedEvents,
  testGroupedEvents,
  getRandomGraphPathPattern,
  getSampleTestCollNames,
  getNodeBraceSampleIds
} = require('../../../helpers/logTestHelpers')
const { db, query, aql } = require('@arangodb')
const { isObject, concat, defaults } = require('lodash')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

describe('Log Handlers - Path as query param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const req = {
      queryParams: {
        path: '/'
      }
    }
    const allEvents = log(req) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(req, allEvents, expectedEvents, logWrapper)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const req = {
      queryParams: {
        path: '/'
      }
    }

    testGroupedEvents('database', req, logWrapper)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const req = {
      queryParams: {
        path: getRandomGraphPathPattern()
      }
    }

    const allEvents = log(req) // Ungrouped events in desc order by ctime.

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

    testUngroupedEvents(req, allEvents, expectedEvents, logWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const req = {
      queryParams: {
        path: getRandomGraphPathPattern()
      }
    }

    return testGroupedEvents('graph', req, logWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const req = {
      queryParams: { path }
    }
    const allEvents = log(req) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(req, allEvents, expectedEvents, logWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const req = {
      queryParams: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
        `
    ]

    testGroupedEvents('collection', req, logWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const req = { queryParams: { path } }
    const allEvents = log(req) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)
    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e,'_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(req, allEvents, expectedEvents, logWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const req = { queryParams: { path } }
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter v._key not in ${getOriginKeys()}
        filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
      `
    ]

    testGroupedEvents('nodeGlob', req, logWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const req = {
      queryParams: { path }
    }
    const allEvents = log(req) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter e.meta._id in ${sampleIds}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(req, allEvents, expectedEvents, logWrapper)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const req = {
      queryParams: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta._id in ${sampleIds}
        `
    ]

    testGroupedEvents('nodeBrace', req, logWrapper, queryParts)
  })
})

describe('Log Handlers - Path as body param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const req = {
      queryParams: {},
      body: {
        path: '/'
      }
    }
    const allEvents = log(req) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(req, allEvents, expectedEvents, logWrapper)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const req = {
      body: {
        path: '/'
      }
    }

    testGroupedEvents('database', req, logWrapper)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const req = {
      queryParams: {},
      body: {
        path: getRandomGraphPathPattern()
      }
    }

    const allEvents = log(req) // Ungrouped events in desc order by ctime.

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

    testUngroupedEvents(req, allEvents, expectedEvents, logWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const req = {
      body: {
        path: getRandomGraphPathPattern()
      }
    }

    return testGroupedEvents('graph', req, logWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const req = {
      queryParams: {},
      body: { path }
    }
    const allEvents = log(req) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(req, allEvents, expectedEvents, logWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const req = {
      body: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
        `
    ]

    testGroupedEvents('collection', req, logWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const req = {
      queryParams: {},
      body: { path }
    }
    const allEvents = log(req) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)
    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e,'_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(req, allEvents, expectedEvents, logWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const req = { body: { path } }
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter v._key not in ${getOriginKeys()}
        filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
      `
    ]

    testGroupedEvents('nodeGlob', req, logWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const req = {
      queryParams: {},
      body: { path }
    }
    const allEvents = log(req) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter e.meta._id in ${sampleIds}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray()

    testUngroupedEvents(req, allEvents, expectedEvents, logWrapper)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const req = {
      body: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta._id in ${sampleIds}
        `
    ]

    testGroupedEvents('nodeBrace', req, logWrapper, queryParts)
  })
})

function logWrapper (pathParam, combo) {
  defaults(pathParam, { queryParams: {} })

  if (isObject(combo)) {
    Object.assign(pathParam.queryParams, combo)
  }

  return log(pathParam)
}
