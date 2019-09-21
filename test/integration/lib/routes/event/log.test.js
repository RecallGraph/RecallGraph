'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/init')
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers')
const {
  testUngroupedEvents,
  testGroupedEvents,
  logGetWrapper,
  logPostWrapper
} = require('../../../../helpers/event/log')
const {
  getOriginKeys,
  getRandomGraphPathPattern,
  getSampleTestCollNames,
  getNodeBraceSampleIds
} = require('../../../../helpers/event')

const { db, query, aql } = require('@arangodb')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

describe('Routes - log (Path as query param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const reqParams = {
      json: true,
      qs: {
        path: '/'
      }
    }
    const allEvents = logGetWrapper(reqParams) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(reqParams, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const reqParams = {
      json: true,
      qs: {
        path: '/'
      }
    }

    testGroupedEvents('database', reqParams, logGetWrapper)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const reqParams = {
      json: true,
      qs: {
        path: getRandomGraphPathPattern()
      }
    }

    const allEvents = logGetWrapper(reqParams) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const sampleDataRefs = init.getSampleDataRefs()
    const sampleGraphCollNames = sampleDataRefs.vertexCollections.concat(sampleDataRefs.edgeCollections)
    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleGraphCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(reqParams, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const reqParams = {
      json: true,
      qs: {
        path: getRandomGraphPathPattern()
      }
    }

    testGroupedEvents('graph', reqParams, logGetWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/c/{${sampleTestCollNames}}`
              : `/c/${sampleTestCollNames}`
    const reqParams = {
      json: true,
      qs: { path }
    }
    const allEvents = logGetWrapper(reqParams) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(reqParams, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/c/{${sampleTestCollNames}}`
              : `/c/${sampleTestCollNames}`
    const reqParams = {
      json: true,
      qs: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('collection', reqParams, logGetWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/ng/{${sampleTestCollNames}}/*`
              : `/ng/${sampleTestCollNames}/*`
    const reqParams = {
      json: true,
      qs: { path }
    }
    const allEvents = logGetWrapper(reqParams) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(reqParams, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/ng/{${sampleTestCollNames}}/*`
              : `/ng/${sampleTestCollNames}/*`
    const reqParams = {
      json: true,
      qs: { path }
    }
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter v._key not in ${getOriginKeys()}
        filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
        for e in ${commandColl}
        filter e._to == v._id
      `
    ]

    testGroupedEvents('nodeGlob', reqParams, logGetWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const reqParams = {
      json: true,
      qs: { path }
    }
    const allEvents = logGetWrapper(reqParams) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter e.meta._id in ${sampleIds}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(reqParams, allEvents, expectedEvents, logGetWrapper)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds(100)
    const reqParams = {
      json: true,
      qs: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta._id in ${sampleIds}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('nodeBrace', reqParams, logGetWrapper, queryParts)
  })
})

describe('Routes - log (Path as body param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified', () => {
    const reqParams = {
      json: true,
      body: {
        path: '/'
      }
    }
    const allEvents = logPostWrapper(reqParams) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(reqParams, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const reqParams = {
      json: true,
      body: {
        path: '/'
      }
    }

    testGroupedEvents('database', reqParams, logPostWrapper)
  })

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
    const reqParams = {
      json: true,
      body: {
        path: getRandomGraphPathPattern()
      }
    }

    const allEvents = logPostWrapper(reqParams) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const sampleDataRefs = init.getSampleDataRefs()
    const sampleGraphCollNames = sampleDataRefs.vertexCollections.concat(sampleDataRefs.edgeCollections)
    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleGraphCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(reqParams, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () => {
    const reqParams = {
      json: true,
      body: {
        path: getRandomGraphPathPattern()
      }
    }

    return testGroupedEvents('graph', reqParams, logPostWrapper)
  })

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/c/{${sampleTestCollNames}}`
              : `/c/${sampleTestCollNames}`
    const req = {
      json: true,
      body: { path }
    }
    const allEvents = logPostWrapper(req) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(req, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/c/{${sampleTestCollNames}}`
              : `/c/${sampleTestCollNames}`
    const reqParams = {
      json: true,
      body: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('collection', reqParams, logPostWrapper, queryParts)
  })

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/ng/{${sampleTestCollNames}}/*`
              : `/ng/${sampleTestCollNames}/*`
    const req = {
      json: true,
      body: { path }
    }
    const allEvents = logPostWrapper(req) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)
    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(req, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/ng/{${sampleTestCollNames}}/*`
              : `/ng/${sampleTestCollNames}/*`
    const reqParams = {
      json: true,
      body: { path }
    }
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter v._key not in ${getOriginKeys()}
        filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
        for e in ${commandColl}
        filter e._to == v._id
      `
    ]

    testGroupedEvents('nodeGlob', reqParams, logPostWrapper, queryParts)
  })

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const reqParams = {
      json: true,
      body: { path }
    }
    const allEvents = logPostWrapper(reqParams) // Ungrouped events in desc order by ctime.

    expect(allEvents).to.be.an.instanceOf(Array)

    const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${getOriginKeys()}
          filter e.meta._id in ${sampleIds}
          for c in ${commandColl}
            filter c._to == e._id
          sort e.ctime desc
        return merge(e, keep(c, 'command'))
      `.toArray()

    testUngroupedEvents(reqParams, allEvents, expectedEvents, logPostWrapper)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const reqParams = {
      json: true,
      body: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta._id in ${sampleIds}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testGroupedEvents('nodeBrace', reqParams, logPostWrapper, queryParts)
  })
})
