/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/util/init')
const { getGroupingClause, getReturnClause, extractDiffs } = require('../../../../../lib/operations/diff/helpers')
const { getRandomSubRange } = require('../../../../helpers/util')
const { getExpectedDiffs } = require('../../../../helpers/event/diff')
const { sample } = require('lodash')
const { aql, db } = require('@arangodb')
const { getLimitClause, getEventLogQueryInitializer } = require('../../../../../lib/operations/helpers')
const { getSortingClause } = require('../../../../../lib/operations/log/helpers')

describe('Diff Helpers - getGroupingClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a grouping clause', () => {
    const groupingClause = getGroupingClause()

    expect(groupingClause).to.be.an.instanceOf(Object)
    expect(groupingClause).to.respondTo('toAQL')
    expect(groupingClause.toAQL()).to.match(
      new RegExp(`collect node = .*$`, 'i')
    )
  })
})

describe('Diff Helpers - getReturnClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a groupwise-sorted return clause',
    () => {
      const reverse = [true, false]
      reverse.forEach(rv => {
        const returnClause = getReturnClause(rv)

        expect(returnClause).to.be.an.instanceOf(Object)
        expect(returnClause).to.have.property('query')
        expect(returnClause.query).match(/return {node, events: \(\s+for ev in events sort ev\.ctime/)
      })
    }
  )
})

describe('Diff Helpers - extractDiffs', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return expected diffs',
    () => {
      const path = '/'
      const timestampRange = [0, ...init.getMilestones(), null]
      const timestampIdx = getRandomSubRange(timestampRange)
      const since = timestampRange[timestampIdx[0]]
      const until = timestampRange[timestampIdx[1]]
      const sort = sample(['asc', 'desc'])
      const skip = sample([0, 1])
      const limit = sample([0, 1])
      const reverse = [true, false]

      reverse.forEach(rv => {
        const queryParts = getEventLogQueryInitializer(path, since, until)
        queryParts.push(getGroupingClause())
        queryParts.push(getSortingClause(sort, 'node'))
        queryParts.push(getLimitClause(limit, skip))
        queryParts.push(getReturnClause(rv))

        const query = aql.join(queryParts, '\n')
        const commandLog = db._query(query).toArray()
        const diffs = extractDiffs(commandLog, rv)
        const combo = { since, until, sort, skip, limit, reverse: rv }
        const expectedDiffs = getExpectedDiffs(path, combo)
        const params = JSON.stringify(combo)

        expect(diffs, params).to.deep.equal(expectedDiffs)
      })
    }
  )
})
