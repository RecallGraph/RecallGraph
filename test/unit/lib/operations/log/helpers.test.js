/* eslint-disable no-unused-expressions */
'use strict'

// noinspection NpmUsedModulesInstalled
const { expect } = require('chai')
const {
  getLimitClause,
  getSortingClause,
  getGroupingClause,
  getReturnClause
} = require('../../../../../lib/operations/log/helpers')
const init = require('../../../../helpers/init')
const {
  cartesian
} = require('../../../../helpers/logTestHelpers')

describe('Log Helpers - getLimitClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a blank clause when no skip and limit are specified', () => {
    const limitClause = getLimitClause()

    expect(limitClause).to.be.an.instanceOf(Object)
    // noinspection BadExpressionStatementJS
    expect(limitClause.query).to.be.empty
  })

  it('should return a limit clause expression when only limit is specified', () => {
    const limit = 1
    const limitClause = getLimitClause(limit)

    expect(limitClause).to.be.an.instanceOf(Object)
    // noinspection BadExpressionStatementJS
    expect(limitClause.query).to.match(/^limit +@\w+$/i)
  })

  it('should return a limit clause expression when both limit and skip are specified', () => {
    const limit = 1
    const skip = 2
    const limitClause = getLimitClause(limit, skip)

    expect(limitClause).to.be.an.instanceOf(Object)
    // noinspection BadExpressionStatementJS
    expect(limitClause.query).to.match(/^limit @\w+, @\w+$/i)
  })
})

describe('Log Helpers - getSortingClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a primary+secondary sort clause when groupBy is null, irrespective of sort and countsOnly',
    () => {
      const sort = [null, 'asc', 'desc']
      const groupBy = null
      const countsOnly = [false, true]
      const combos = cartesian({ countsOnly, sort })
      combos.forEach(combo => {
        const sortingClause = getSortingClause(
          combo.sort,
          groupBy,
          combo.countsOnly
        )

        expect(sortingClause).to.be.an.instanceOf(Object)
        // noinspection JSUnresolvedFunction
        expect(sortingClause).to.respondTo('toAQL')
        expect(sortingClause.toAQL()).to.match(/^sort \S+ (asc|desc), \S+ asc$/i)
      })
    })

  it(
    'should return a primary+secondary sort clause when groupBy is specified and countsOnly is true, irrespective of' +
    ' sort',
    () => {
      const sort = [null, 'asc', 'desc']
      const groupBy = ['node', 'collection', 'event']
      const countsOnly = true
      const combos = cartesian({ groupBy, sort })
      combos.forEach(combo => {
        const sortingClause = getSortingClause(
          combo.sort,
          combo.groupBy,
          countsOnly
        )

        expect(sortingClause).to.be.an.instanceOf(Object)
        // noinspection JSUnresolvedFunction
        expect(sortingClause).to.respondTo('toAQL')
        expect(sortingClause.toAQL()).to.match(
          /^sort \S+ (asc|desc), \S+ asc$/i
        )
      })
    }
  )

  it(
    'should return a secondary sort clause when groupBy is specified and countsOnly is false, irrespective of sort',
    () => {
      const sort = [null, 'asc', 'desc']
      const groupBy = ['node', 'collection', 'event']
      const countsOnly = false
      const combos = cartesian({ groupBy, sort })
      combos.forEach(combo => {
        const sortingClause = getSortingClause(
          combo.sort,
          combo.groupBy,
          countsOnly
        )

        expect(sortingClause).to.be.an.instanceOf(Object)
        // noinspection JSUnresolvedFunction
        expect(sortingClause).to.respondTo('toAQL')
        expect(sortingClause.toAQL()).to.match(/^sort \S+ asc$/i)
      })
    }
  )
})

describe('Log Helpers - getGroupingClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a blank clause when no groupBy specified, irrespective of countsOnly and returnCommands', () => {
    const groupBy = null
    const countsOnly = [false, true]
    const returnCommands = [false, true]
    const combos = cartesian({ countsOnly, returnCommands })
    combos.forEach(combo => {
      const groupingClause = getGroupingClause(groupBy, combo.countsOnly, combo.returnCommands)

      expect(groupingClause).to.be.an.instanceOf(Object)
      // noinspection JSUnresolvedFunction
      expect(groupingClause).to.respondTo('toAQL')
      // noinspection BadExpressionStatementJS
      expect(groupingClause.toAQL()).to.be.empty
    })
  })

  it('should return a grouping clause when groupBy is specified, irrespective of countsOnly and returnCommands', () => {
    const groupBy = ['node', 'collection', 'event']
    const countsOnly = [false, true]
    const returnCommands = [false, true]
    const combos = cartesian({ groupBy, countsOnly, returnCommands })
    combos.forEach(combo => {
      const groupingClause = getGroupingClause(combo.groupBy, combo.countsOnly, combo.returnCommands)

      expect(groupingClause).to.be.an.instanceOf(Object)
      // noinspection JSUnresolvedFunction
      expect(groupingClause).to.respondTo('toAQL')
      expect(groupingClause.toAQL()).to.match(
        new RegExp(`collect ${combo.groupBy} = .*$`, 'i')
      )
    })
  })
})

describe('Log Helpers - getReturnClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a default return clause when groupBy is null, irrespective of other params', () => {
    const groupBy = null
    const countsOnly = [false, true]
    const groupSort = [null, 'asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 1]
    const returnCommands = [false, true]
    const combos = cartesian({ countsOnly, groupSort, groupSkip, groupLimit, returnCommands })
    combos.forEach(combo => {
      const returnClause = getReturnClause(
        groupBy,
        combo.countsOnly,
        combo.groupSort,
        combo.groupSkip,
        combo.groupLimit,
        combo.returnCommands
      )

      expect(returnClause).to.be.an.instanceOf(Object)
      // noinspection JSUnresolvedFunction
      expect(returnClause).to.respondTo('toAQL')
      expect(returnClause.toAQL()).include('return')
    })
  })

  it('should return a default return clause when groupBy is specified and countsOnly is true, irrespective of other' +
    ' params',
  () => {
    const groupBy = ['node', 'collection', 'event']
    const countsOnly = true
    const groupSort = [null, 'asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 1]
    const returnCommands = [false, true]
    const combos = cartesian({ groupBy, groupSort, groupSkip, groupLimit, returnCommands })
    combos.forEach(combo => {
      const returnClause = getReturnClause(
        combo.groupBy,
        countsOnly,
        combo.groupSort,
        combo.groupSkip,
        combo.groupLimit,
        combo.returnCommands
      )

      expect(returnClause).to.be.an.instanceOf(Object)
      // noinspection JSUnresolvedFunction
      expect(returnClause).to.respondTo('toAQL')
      expect(returnClause.toAQL()).include('return')
    })
  })

  it(
    'should return a groupwise-sorted return clause when groupBy is specified and countsOnly is false',
    () => {
      const groupBy = ['node', 'collection', 'event']
      const countsOnly = false
      const groupSort = [null, 'asc', 'desc']
      const groupSkip = [0, 1]
      const groupLimit = [0, 1]
      const returnCommands = [false, true]
      const combos = cartesian({ groupBy, groupSort, groupSkip, groupLimit, returnCommands })
      combos.forEach(combo => {
        const returnClause = getReturnClause(
          combo.groupBy,
          countsOnly,
          combo.groupSort,
          combo.groupSkip,
          combo.groupLimit,
          combo.returnCommands
        )

        expect(returnClause).to.be.an.instanceOf(Object)
        expect(returnClause).to.have.property('query')
        expect(returnClause.query).match(/events.*sort.*(asc|desc).*(limit.*)?return/)
      })
    }
  )
})
