'use strict'

const {
  isObject, findIndex, findLastIndex, range, cloneDeep, omit, partialRight, defaults, omitBy, isNil, ary
} = require('lodash')
const request = require('@arangodb/request')
// noinspection JSUnresolvedVariable
const { baseUrl } = module.context
const { expect } = require('chai')
const { log: logHandler } = require('../../../lib/handlers/logHandlers')
const { getLimitClause, getTimeBoundFilters } = require('../../../lib/operations/helpers')
const { aql, db } = require('@arangodb')
const { getSortingClause, getReturnClause, getGroupingClause } = require('../../../lib/operations/log/helpers')
const { getRandomSubRange, cartesian, initQueryParts } = require('.')

exports.testUngroupedEvents = function testUngroupedEvents (
  pathParam,
  allEvents,
  expectedEvents,
  logFn
) {
  const expectedEventsSansCommands = expectedEvents.map(partialRight(omit, 'command'))
  expect(allEvents).to.deep.equal(expectedEventsSansCommands)

  if (allEvents.length) {
    const timeRange = getRandomSubRange(expectedEvents)
    const sliceRange = getRandomSubRange(range(1, timeRange[1] - timeRange[0]))
    const since = [0, Math.floor(expectedEvents[timeRange[1]].ctime)]
    const until = [0, Math.ceil(expectedEvents[timeRange[0]].ctime)]
    const skip = [0, sliceRange[0]]
    const limit = [0, sliceRange[1]]
    const sort = ['asc', 'desc']
    const groupBy = [null]
    const countsOnly = [false, true]
    const groupSort = ['asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 2]
    const returnCommands = [false, true]
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
      groupLimit,
      returnCommands
    })

    combos.forEach(combo => {
      const events = logFn(pathParam, combo)

      expect(events).to.be.an.instanceOf(Array)

      const relevantExpectedEvents = combo.returnCommands ? expectedEvents : expectedEventsSansCommands

      const earliestTimeBoundIndex = combo.since
        ? findLastIndex(relevantExpectedEvents, e => e.ctime >= combo.since)
        : relevantExpectedEvents.length - 1
      const latestTimeBoundIndex =
        combo.until && findIndex(relevantExpectedEvents, e => e.ctime <= combo.until)

      const timeSlicedEvents = relevantExpectedEvents.slice(
        latestTimeBoundIndex,
        earliestTimeBoundIndex + 1
      )
      const sortedTimeSlicedEvents =
        combo.sort === 'asc'
          ? timeSlicedEvents.reverse()
          : timeSlicedEvents

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

      expect(events.length).to.equal(slicedSortedTimeSlicedEvents.length)
      expect(events[0]).to.deep.equal(slicedSortedTimeSlicedEvents[0])
      events.forEach((event, idx) => {
        expect(event).to.be.an.instanceOf(Object)
        expect(event._id).to.equal(slicedSortedTimeSlicedEvents[idx]._id)
      })
    })
  }
}

exports.testGroupedEvents = function testGroupedEvents (
  scope,
  pathParam,
  logFn,
  qp = null
) {
  const allEvents = logFn(pathParam) // Ungrouped events in desc order by ctime.

  if (allEvents.length) {
    const timeRange = getRandomSubRange(allEvents)
    const since = [0, Math.floor(allEvents[timeRange[1]].ctime)]
    const until = [0, Math.ceil(allEvents[timeRange[0]].ctime)]
    const sort = ['asc', 'desc']
    const skip = [0, 1]
    const limit = [0, 2]
    const groupBy = ['node', 'collection', 'event']
    const countsOnly = [false, true]
    const groupSort = ['asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 2]
    const returnCommands = [false, true]

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
      groupLimit,
      returnCommands
    })
    combos.forEach(combo => {
      const eventGroups = logFn(pathParam, combo)

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
        groupLimit: glmt,
        returnCommands: rc
      } = combo
      const queryParts = cloneDeep(qp || initQueryParts(scope))

      const timeBoundFilters = getTimeBoundFilters(snc, utl)
      timeBoundFilters.forEach(filter => queryParts.push(filter))

      queryParts.push(getGroupingClauseForExpectedResultsQuery(gb, co, rc))
      queryParts.push(getSortingClause(st, gb, co))
      queryParts.push(getLimitClause(lmt, skp))
      queryParts.push(getReturnClause(gb, co, gst, gskp, glmt, rc))

      const query = aql.join(queryParts, '\n')
      const expectedEventGroups = db._query(query).toArray()
      const params = JSON.stringify({ pathParam, combo })

      expect(eventGroups.length, params).to.equal(expectedEventGroups.length)

      const aggrField = co ? 'total' : 'events'
      eventGroups.forEach((eventGroup, idx1) => {
        expect(eventGroup, params).to.be.an.instanceOf(Object)
        expect(eventGroup[gb], params).to.equal(expectedEventGroups[idx1][gb])

        expect(eventGroup, params).to.have.property(aggrField)
        if (co) {
          expect(eventGroup[aggrField], params).to.equal(expectedEventGroups[idx1][aggrField])
        } else {
          expect(eventGroup[aggrField], params).to.be.an.instanceOf(Array)
          expect(eventGroup[aggrField].length, params).to.equal(expectedEventGroups[idx1][aggrField].length)

          if (eventGroup[aggrField].length > 0) {
            expect(eventGroup[aggrField][0], params).to.deep.equal(expectedEventGroups[idx1][aggrField][0])
            eventGroup[aggrField].forEach((event, idx2) => {
              expect(event, params).to.be.an.instanceOf(Object)
              expect(event._id, params).to.equal(expectedEventGroups[idx1][aggrField][idx2]._id)
            })
          }
        }
      })
    })
  }
}

function getGroupingClauseForExpectedResultsQuery (groupBy, countsOnly, returnCommands) {
  if (groupBy !== 'collection') {
    return getGroupingClause(groupBy, countsOnly, returnCommands)
  } else {
    const groupingPrefix =
      'collect collection = regex_split(v.meta._id, "/")[0]'

    let groupingSuffix
    if (countsOnly) {
      groupingSuffix = 'with count into total'
    } else if (returnCommands) {
      groupingSuffix = 'into events = merge(v, {command: e.command})'
    } else {
      groupingSuffix = 'into events = v'
    }

    return aql.literal(`${groupingPrefix} ${groupingSuffix}`)
  }
}

exports.getGroupingClauseForExpectedResultsQuery = getGroupingClauseForExpectedResultsQuery

function logRequestWrapper (reqParams, combo, method = 'get') {
  defaults(reqParams, { qs: {} })

  if (isObject(combo)) {
    Object.assign(reqParams.qs, omitBy(combo, isNil))
  }

  const response = request[method](`${baseUrl}/event/log`, reqParams)

  expect(response).to.be.an.instanceOf(Object)
  expect(response.statusCode).to.equal(200)

  return JSON.parse(response.body)
}

exports.logGetWrapper = ary(logRequestWrapper, 2)

exports.logPostWrapper = partialRight(logRequestWrapper, 'post')

exports.logHandlerWrapper = function logHandlerWrapper (pathParam, combo) {
  defaults(pathParam, { queryParams: {} })

  if (isObject(combo)) {
    Object.assign(pathParam.queryParams, combo)
  }

  return logHandler(pathParam)
}
