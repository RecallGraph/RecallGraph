'use strict'

const jiff = require('jiff')
const { expect } = require('chai')
const { aql, db } = require('@arangodb')
const request = require('@arangodb/request')
const { isObject, omitBy, isNil, cloneDeep, omit, isEqual, differenceWith, isEmpty } = require('lodash')
const { initQueryParts } = require('.')
const log = require('../../../lib/operations/log')
const { diff: diffHandler } = require('../../../lib/handlers/diffHandlers')
const { getRandomSubRange, cartesian, generateFilters } = require('../util')
const { getLimitClause, getTimeBoundFilters, filter } = require('../../../lib/operations/helpers')
const { getSortingClause, getReturnClause, getGroupingClause } = require('../../../lib/operations/log/helpers')

function diffRequestWrapper (reqParams, combo, method = 'get') {
  if (isObject(combo)) {
    Object.assign(reqParams.qs, omitBy(combo, isNil))
  }

  const response = request[method](`${module.context.baseUrl}/event/diff`, reqParams)

  expect(response).to.be.an.instanceOf(Object)
  expect(response.statusCode).to.equal(200)

  return JSON.parse(response.body)
}

function diffHandlerWrapper (req, combo) {
  if (isObject(combo)) {
    Object.assign(req.queryParams, combo)
  }

  return diffHandler(req)
}

function compareDiffs (diffs, expectedDiffs, param) {
  if (diffs.length !== expectedDiffs.length) {
    console.debug({
      actual: differenceWith(diffs, expectedDiffs, isEqual),
      expected: differenceWith(expectedDiffs, diffs, isEqual)
    })
  }

  expect(diffs.length, param).to.equal(expectedDiffs.length)
  expect(diffs[0], param).to.deep.equal(expectedDiffs[0])
  diffs.forEach((diff, idx) => {
    expect(diff, param).to.be.an.instanceOf(Object)
    expect(diff.node, param).to.equal(expectedDiffs[idx].node)

    expect(diff.events, param).to.be.an.instanceOf(Array)
    diff.events.forEach((event, idx2) => {
      expect(event, param).to.be.an.instanceOf(Object)
      expect(event._id, param).to.equal(expectedDiffs[idx].events[idx2]._id)
    })

    expect(diff.commands, param).to.be.an.instanceOf(Array)
    diff.commands.forEach((command, idx2) => {
      expect(command, param).to.be.an.instanceOf(Array)
      expect(command.length, param).to.equal(expectedDiffs[idx].commands[idx2].length)
    })
  })
}

// Public
function testDiffs (scope, path, diffFn, qp = null) {
  const allEvents = log(path) // Ungrouped events in desc order by ctime.

  if (allEvents.length) {
    const timeRange = getRandomSubRange(allEvents)
    const since = [0, Math.floor(allEvents[timeRange[1]].ctime)]
    const until = [0, Math.ceil(allEvents[timeRange[0]].ctime)]
    const sort = ['asc', 'desc']
    const skip = [0, 1]
    const limit = [0, 2]
    const reverse = [false, true]

    const combos = cartesian({
      since,
      until,
      skip,
      limit,
      sort,
      reverse
    })
    combos.forEach(combo => {
      let diffs = diffFn(path, combo)

      expect(diffs).to.be.an.instanceOf(Array)

      const {
        since: snc,
        until: utl,
        skip: skp,
        limit: lmt,
        sort: st,
        reverse: rv
      } = combo
      const queryParts = cloneDeep(qp || initQueryParts(scope))

      const timeBoundFilters = getTimeBoundFilters(snc, utl)
      timeBoundFilters.filters.forEach(filter => queryParts.push(filter))

      queryParts.push(getGroupingClause('node', false))
      queryParts.push(getSortingClause(st, 'node', false))
      queryParts.push(getLimitClause(lmt, skp))
      queryParts.push(getReturnClause('node', false, rv ? 'desc' : 'asc', rv))

      const query = aql.join(queryParts, '\n')
      const expectedEventGroups = db._query(query).toArray()
      const expectedDiffs = expectedEventGroups.map(item => ({
        node: item.node,
        commands: item.events.map(event => rv ? jiff.inverse(event.command).map(
          step => omit(step, 'context')) : event.command)
      }))

      let param = JSON.stringify({ path, combo })
      compareDiffs(diffs, expectedDiffs, param)

      const postFilter = generateFilters(diffs)
      if (!isEmpty(postFilter)) {
        combo.postFilter = postFilter
        diffs = diffFn(path, combo)
        const filteredExpectedDiffs = filter(expectedDiffs, postFilter)
        param = JSON.stringify({ path, combo })
        compareDiffs(diffs, filteredExpectedDiffs, param)
      }
    })
  }
}

function diffGetWrapper (path, combo) {
  const reqParams = {
    json: true,
    qs: {
      path
    }
  }

  return diffRequestWrapper(reqParams, combo)
}

function diffPostWrapper (path, combo) {
  const reqParams = {
    json: true,
    qs: {},
    body: {
      path
    }
  }

  return diffRequestWrapper(reqParams, combo, 'post')
}

function diffHandlerQueryWrapper (path, combo) {
  const req = {
    queryParams: {
      path
    }
  }

  return diffHandlerWrapper(req, combo)
}

function diffHandlerBodyWrapper (path, combo) {
  const req = {
    queryParams: {},
    body: {
      path
    }
  }

  return diffHandlerWrapper(req, combo)
}

module.exports = {
  testDiffs,
  diffGetWrapper,
  diffPostWrapper,
  diffHandlerQueryWrapper,
  diffHandlerBodyWrapper
}
