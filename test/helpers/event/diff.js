'use strict'

const jiff = require('jiff')
const { expect } = require('chai')
const { db, query } = require('@arangodb')
const request = require('@arangodb/request')
const { isObject, omitBy, isNil, isEqual, differenceWith, isEmpty, omit, map, cloneDeep } = require('lodash')
const log = require('../../../lib/operations/log')
const { diff: diffHandler } = require('../../../lib/handlers/diffHandlers')
const { SERVICE_COLLECTIONS } = require('../../../lib/constants')
const { getRandomSubRange, cartesian, generateFilters } = require('../util')
const { filter } = require('../../../lib/operations/helpers')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

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
function getExpectedDiffs (path, combo) {
  combo = cloneDeep(combo)

  const {
    sort: st,
    reverse: rv
  } = combo
  combo.groupBy = 'node'

  const expectedEvents = log(path, combo).flatMap(group => map(group.events, '_id'))
  const expectedDiffs = query`
        for e in ${eventColl}
        filter e._id in ${expectedEvents}
        sort e.ctime ${rv ? 'desc' : 'asc'}
        
        for c in ${commandColl}
        filter c._to == e._id
        
        collect node = e.meta.id aggregate events = unique(e), commands = unique(c)
        sort node ${st}
        
        return {
          node,
          commandsAreReversed: ${rv},
          events: events[* return merge(keep(CURRENT, '_id', '_key', 'ctime', 'event', 'last-snapshot'), {
            meta: {
              rev: CURRENT.meta.rev
            }
          })],
          commands: commands[* return CURRENT.command]
        }
      `.toArray()

  if (rv) {
    for (const diff of expectedDiffs) {
      for (let i = 0; i < diff.commands.length; i++) {
        diff.commands[i] = jiff.inverse(diff.commands[i]).map(step => omit(step, 'context'))
      }
    }
  }

  return expectedDiffs
}

function testDiffs (scope, path, diffFn) {
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

      const expectedDiffs = getExpectedDiffs(path, combo)
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
  getExpectedDiffs,
  testDiffs,
  diffGetWrapper,
  diffPostWrapper,
  diffHandlerQueryWrapper,
  diffHandlerBodyWrapper
}
