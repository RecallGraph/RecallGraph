'use strict'

const {
  isObject, findIndex, findLastIndex, range, cloneDeep, omitBy, isNil, differenceWith, isEqual, isEmpty
} = require('lodash')
const request = require('@arangodb/request')
const { expect } = require('chai')
const { log: logHandler } = require('../../../lib/handlers/logHandlers')
const {
  getLimitClause, getTimeBoundFilters, getCollTypeInitializer, filter
} = require('../../../lib/operations/helpers')
const { aql, db, query } = require('@arangodb')
const { getSortingClause, getReturnClause, getGroupingClause } = require('../../../lib/operations/log/helpers')
const { initQueryParts } = require('.')
const { getRandomSubRange, cartesian, generateFilters } = require('../util')
const { SERVICE_COLLECTIONS } = require('../../../lib/constants')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

function compareEvents (events, expectedEvents, param, combo) {
  if (events.length !== expectedEvents.length) {
    console.debug({
      actual: differenceWith(events, expectedEvents, isEqual),
      expected: differenceWith(expectedEvents, events, isEqual)
    })
  }

  expect(events.length, param).to.equal(expectedEvents.length)
  expect(events[0], param).to.deep.equal(expectedEvents[0])

  if (!combo.countsOnly) {
    events.forEach((event, idx) => {
      expect(event, param).to.be.an.instanceOf(Object)
      expect(event._id, param).to.equal(expectedEvents[idx]._id)
    })
  }
}

function compareEventGroups (eventGroups, expectedEventGroups, param, combo) {
  if (eventGroups.length !== expectedEventGroups.length) {
    console.debug({
      actual: differenceWith(eventGroups, expectedEventGroups, isEqual),
      expected: differenceWith(expectedEventGroups, eventGroups, isEqual)
    })
  }

  const {
    groupBy: gb,
    countsOnly: co
  } = combo

  expect(eventGroups.length, param).to.equal(expectedEventGroups.length)

  const aggrField = co ? 'total' : 'events'
  eventGroups.forEach((eventGroup, idx1) => {
    expect(eventGroup, param).to.be.an.instanceOf(Object)
    expect(eventGroup[gb], param).to.equal(expectedEventGroups[idx1][gb])

    expect(eventGroup, param).to.have.property(aggrField)
    if (co) {
      expect(eventGroup[aggrField], param).to.equal(expectedEventGroups[idx1][aggrField])
    } else {
      expect(eventGroup[aggrField], param).to.be.an.instanceOf(Array)
      expect(eventGroup[aggrField].length, param).to.equal(expectedEventGroups[idx1][aggrField].length)

      if (eventGroup[aggrField].length > 0) {
        expect(eventGroup[aggrField][0], param).to.deep.equal(expectedEventGroups[idx1][aggrField][0])
        eventGroup[aggrField].forEach((event, idx2) => {
          expect(event, param).to.be.an.instanceOf(Object)
          expect(event._id, param).to.equal(expectedEventGroups[idx1][aggrField][idx2]._id)
        })
      }
    }
  })
}

function logRequestWrapper (reqParams, combo, method = 'get') {
  if (isObject(combo)) {
    Object.assign(reqParams.qs, omitBy(combo, isNil))
  }

  const response = request[method](`${module.context.baseUrl}/event/log`, reqParams)

  const params = JSON.stringify({ reqParams, response: response.body })
  expect(response, params).to.be.an.instanceOf(Object)
  expect(response.statusCode, params).to.equal(200)

  return JSON.parse(response.body)
}

function logHandlerWrapper (req, combo) {
  if (isObject(combo)) {
    Object.assign(req.queryParams, omitBy(combo, isNil))
  }

  return logHandler(req)
}

// Public
function testUngroupedEvents (pathParam, allEvents, expectedEvents, logFn) {
  expect(allEvents).to.deep.equal(expectedEvents)

  if (allEvents.length) {
    const timeRange = getRandomSubRange(expectedEvents)
    const sliceRange = getRandomSubRange(range(1, timeRange[1] - timeRange[0]))
    const since = [0, Math.floor(expectedEvents[timeRange[1]].ctime)]
    const until = [0, Math.ceil(expectedEvents[timeRange[0]].ctime)]
    const skip = [0, sliceRange[0]]
    const limit = [0, sliceRange[1]]
    const sort = ['asc', 'desc']
    const groupBy = [undefined]
    const countsOnly = [false, true]
    const groupSort = ['asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 2]
    const combos = cartesian({
      since,
      until,
      skip,
      limit,
      sort,
      groupBy,
      countsOnly,
      groupSort,
      groupSkip,
      groupLimit
    })

    combos.forEach(combo => {
      let events = logFn(pathParam, combo)
      expect(events).to.be.an.instanceOf(Array)

      const earliestTimeBoundIndex = combo.since
        ? findLastIndex(expectedEvents, e => e.ctime >= combo.since)
        : expectedEvents.length - 1
      const latestTimeBoundIndex =
        combo.until && findIndex(expectedEvents, e => e.ctime <= combo.until)

      const timeSlicedEvents = expectedEvents.slice(
        latestTimeBoundIndex,
        earliestTimeBoundIndex + 1
      )

      let sortedTimeSlicedEvents
      if (combo.countsOnly) {
        sortedTimeSlicedEvents = timeSlicedEvents
      } else {
        sortedTimeSlicedEvents = (combo.sort === 'asc') ? timeSlicedEvents.reverse() : timeSlicedEvents
      }

      if (combo.countsOnly) {
        sortedTimeSlicedEvents = [{ total: sortedTimeSlicedEvents.length }]
      }

      let slicedSortedTimeSlicedEvents
      let start = 0
      let end = 0
      if (combo.limit) {
        start = combo.skip
        end = start + combo.limit
        slicedSortedTimeSlicedEvents = sortedTimeSlicedEvents.slice(start, end)
      } else {
        slicedSortedTimeSlicedEvents = sortedTimeSlicedEvents
      }

      let param = JSON.stringify({ pathParam, combo })
      compareEvents(events, slicedSortedTimeSlicedEvents, param, combo)

      const postFilter = generateFilters(events)
      if (!isEmpty(postFilter)) {
        combo.postFilter = postFilter
        events = logFn(pathParam, combo)
        const filteredSlicedSortedTimeSlicedEvents = filter(slicedSortedTimeSlicedEvents, postFilter)
        param = JSON.stringify({ pathParam, combo })
        compareEvents(events, filteredSlicedSortedTimeSlicedEvents, param, combo)
      }
    })
  }
}

function testGroupedEvents (scope, pathParam, logFn, qp = null) {
  const allEvents = logFn(pathParam) // Ungrouped events in desc order by ctime.

  if (allEvents.length) {
    const timeRange = getRandomSubRange(allEvents)
    const since = [0, Math.floor(allEvents[timeRange[1]].ctime)]
    const until = [0, Math.ceil(allEvents[timeRange[0]].ctime)]
    const sort = ['asc', 'desc']
    const skip = [0, 1]
    const limit = [0, 2]
    const groupBy = ['node', 'collection', 'event', 'type']
    const countsOnly = [false, true]
    const groupSort = ['asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 2]
    const combos = cartesian({
      since,
      until,
      skip,
      limit,
      sort,
      groupBy,
      countsOnly,
      groupSort,
      groupSkip,
      groupLimit
    })
    combos.forEach(combo => {
      let eventGroups = logFn(pathParam, combo)

      expect(eventGroups).to.be.an.instanceOf(Array)

      const {
        since: snc,
        until: utl,
        skip: skp,
        limit: lmt,
        sort: st,
        groupBy: gb,
        countsOnly: co,
        groupSort: gst,
        groupSkip: gskp,
        groupLimit: glmt
      } = combo
      const queryParts = [getCollTypeInitializer()]
      queryParts.push(...cloneDeep(qp || initQueryParts(scope)))

      const timeBoundFilters = getTimeBoundFilters(snc, utl)
      timeBoundFilters.filters.forEach(filter => queryParts.push(filter))

      queryParts.push(getGroupingClause(gb, co))
      queryParts.push(getSortingClause(st, gb, co))
      queryParts.push(getLimitClause(lmt, skp))
      queryParts.push(getReturnClause(gb, co, gst, gskp, glmt))

      const query = aql.join(queryParts, '\n')
      const expectedEventGroups = db._query(query).toArray()
      let param = JSON.stringify({ pathParam, combo })
      compareEventGroups(eventGroups, expectedEventGroups, param, combo)

      const postFilter = generateFilters(eventGroups)
      if (postFilter) {
        combo.postFilter = postFilter
        eventGroups = logFn(pathParam, combo)
        const filteredEventGroups = filter(expectedEventGroups, postFilter)
        param = JSON.stringify({ pathParam, combo })
        compareEventGroups(eventGroups, filteredEventGroups, param, combo)
      }
    })
  }
}

function getUngroupedExpectedEvents (scope, { collNames, pattern, nids } = {}) {
  let cursor
  switch (scope.toLowerCase()) {
    case 'db':
      cursor = query`
        for e in ${eventColl}
        filter !(e['is-origin-node'] || e['is-super-origin-node'])
        sort e.ctime desc
        
        return e
      `
      break

    case 'graph':
      cursor = query`
        for e in ${eventColl}
        filter !e['is-origin-node']
        filter e.collection in ${collNames}
        sort e.ctime desc
        
        return e
      `
      break

    case 'collection':
      cursor = query`
        for e in ${eventColl}
        filter !(e['is-origin-node'] || e['is-super-origin-node'])
        filter e.collection =~ ${pattern}
        sort e.ctime desc
        
        return e
      `
      break

    case 'node-glob':
      cursor = query`
        for e in ${eventColl}
        filter !(e['is-origin-node'] || e['is-super-origin-node'])
        filter e.meta.id =~ ${pattern}
        sort e.ctime desc
        
        return e
      `
      break

    case 'node-brace':
      cursor = query`
        for e in ${eventColl}
        filter e.meta.id in ${nids}
        sort e.ctime desc
        
        return e
      `
  }

  return cursor.toArray()
}

function getGroupedExpectedEventsQueryParts (scope, { pattern, nids } = {}) {
  const queryParts = []
  switch (scope.toLowerCase()) {
    case 'collection':
      queryParts.push(
        aql`
          for v in ${eventColl}
          filter !(v['is-origin-node'] || v['is-super-origin-node'])
          filter v.collection =~ ${pattern}
        `
      )
      break

    case 'node-glob':
      queryParts.push(
        aql`
          for v in ${eventColl}
          filter !(v['is-origin-node'] || v['is-super-origin-node'])
          filter v.meta.id =~ ${pattern}
        `
      )
      break

    case 'node-brace':
      queryParts.push(
        aql`
          for v in ${eventColl}
          filter v.meta.id in ${nids}
        `
      )
  }

  return queryParts
}

function logGetWrapper (path, combo) {
  const reqParams = {
    json: true,
    qs: {
      path
    }
  }

  return logRequestWrapper(reqParams, combo)
}

function logPostWrapper (path, combo) {
  const reqParams = {
    json: true,
    qs: {},
    body: {
      path
    }
  }

  return logRequestWrapper(reqParams, combo, 'post')
}

function logHandlerQueryWrapper (path, combo) {
  const req = {
    queryParams: {
      path
    }
  }

  return logHandlerWrapper(req, combo)
}

function logHandlerBodyWrapper (path, combo) {
  const req = {
    queryParams: {},
    body: {
      path
    }
  }

  return logHandlerWrapper(req, combo)
}

module.exports = {
  testUngroupedEvents,
  testGroupedEvents,
  getUngroupedExpectedEvents,
  getGroupedExpectedEventsQueryParts,
  logGetWrapper,
  logPostWrapper,
  logHandlerQueryWrapper,
  logHandlerBodyWrapper
}
