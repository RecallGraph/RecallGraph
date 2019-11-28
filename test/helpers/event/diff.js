'use strict'

const { expect } = require('chai')
const { getGroupingClauseForExpectedResultsQuery } = require('./log')
const { getRandomSubRange, cartesian, initQueryParts } = require('.')

const { cloneDeep, omit } = require('lodash')

const { aql, db } = require('@arangodb')
const { getLimitClause, getTimeBoundFilters } = require('../../../lib/operations/helpers')
const { getSortingClause, getReturnClause } = require('../../../lib/operations/log/helpers')
const jiff = require('jiff')

exports.testDiffs = function testDiffs (scope, pathParam, diffFn, logfn, qp = null) {
  const allEvents = logfn(pathParam) // Ungrouped events in desc order by ctime.

  if (allEvents.length) {
    const timeRange = getRandomSubRange(allEvents)
    const since = [0, Math.floor(allEvents[timeRange[1]].ctime)]
    const until = [0, Math.ceil(allEvents[timeRange[0]].ctime)]
    const sort = ['asc', 'desc']
    const skip = [0, 1]
    const limit = [0, 2]
    const groupSkip = [0, 1]
    const groupLimit = [0, 2]
    const reverse = [false, true]

    const combos = cartesian({
      since,
      until,
      skip,
      limit,
      sort,
      groupSkip,
      groupLimit,
      reverse
    })
    combos.forEach(combo => {
      const diffs = diffFn(pathParam, combo)

      expect(diffs).to.be.an.instanceOf(Array)

      const {
        since: snc,
        until: utl,
        skip: skp,
        limit: lmt,
        sort: st,
        groupSkip: gskp,
        groupLimit: glmt,
        reverse: rv
      } = combo
      const queryParts = cloneDeep(qp || initQueryParts(scope))

      const timeBoundFilters = getTimeBoundFilters(snc, utl)
      timeBoundFilters.forEach(filter => queryParts.push(filter))

      queryParts.push(getGroupingClauseForExpectedResultsQuery('node', false, true))
      queryParts.push(getSortingClause(st, 'node', false))
      queryParts.push(getLimitClause(lmt, skp))
      queryParts.push(getReturnClause('node', false, rv ? 'desc' : 'asc', gskp, glmt, rv))

      const query = aql.join(queryParts, '\n')
      const expectedEventGroups = db._query(query).toArray()
      const expectedDiffs = expectedEventGroups.map(item => ({
        node: item.node,
        commands: item.events.map(event => rv ? jiff.inverse(event.command).map(
          step => omit(step, 'context')) : event.command)
      }))

      expect(diffs.length).to.equal(expectedDiffs.length)
      expect(diffs[0]).to.deep.equal(expectedDiffs[0])
      diffs.forEach((diff, idx) => {
        expect(diff).to.be.an.instanceOf(Object)
        expect(diff.node).to.equal(expectedDiffs[idx].node)
        expect(diff.commands).to.be.an.instanceOf(Array)
        diff.commands.forEach((command, idx2) => {
          expect(command).to.be.an.instanceOf(Array)
          expect(command.length).to.equal(expectedDiffs[idx].commands[idx2].length)
        })
      })
    })
  }
}
