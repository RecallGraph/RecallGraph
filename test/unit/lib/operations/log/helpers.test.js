/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const {
  getSortingClause,
  getGroupingClause,
  getReturnClause
} = require('../../../../../lib/operations/log/helpers')
const init = require('../../../../helpers/init')
const {
  cartesian
} = require('../../../../helpers/eventTestHelpers')

describe('Log Helpers - getSortingClause', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return a primary+secondary sort clause when groupBy is null, irrespective of sortType and countsOnly',
    () => {
      const sortType = [null, 'asc', 'desc']
      const groupBy = null
      const countsOnly = [false, true]
      const combos = cartesian({ countsOnly, sortType })
      combos.forEach(combo => {
        const sortingClause = getSortingClause(
          combo.sortType,
          groupBy,
          combo.countsOnly
        )

        expect(sortingClause).to.be.an.instanceOf(Object)
        expect(sortingClause).to.respondTo('toAQL')
        expect(sortingClause.toAQL()).to.match(/^sort \S+ (asc|desc), \S+ asc$/i)
      })
    })

  it(
    'should return a primary+secondary sort clause when groupBy is specified and countsOnly is true, irrespective of' +
    ' sortType',
    () => {
      const sortType = [null, 'asc', 'desc']
      const groupBy = ['node', 'collection', 'event']
      const countsOnly = true
      const combos = cartesian({ groupBy, sortType })
      combos.forEach(combo => {
        const sortingClause = getSortingClause(
          combo.sortType,
          combo.groupBy,
          countsOnly
        )

        expect(sortingClause).to.be.an.instanceOf(Object)
        expect(sortingClause).to.respondTo('toAQL')
        expect(sortingClause.toAQL()).to.match(
          /^sort \S+ (asc|desc), \S+ asc$/i
        )
      })
    }
  )

  it(
    'should return a secondary sort clause when groupBy is specified and countsOnly is false, irrespective of' +
    ' sortType',
    () => {
      const sortType = [null, 'asc', 'desc']
      const groupBy = ['node', 'collection', 'event']
      const countsOnly = false
      const combos = cartesian({ groupBy, sortType })
      combos.forEach(combo => {
        const sortingClause = getSortingClause(
          combo.sortType,
          combo.groupBy,
          countsOnly
        )

        expect(sortingClause).to.be.an.instanceOf(Object)
        expect(sortingClause).to.respondTo('toAQL')
        expect(sortingClause.toAQL()).to.match(/^sort \S+ asc$/i)
      })
    }
  )
})

describe('Log Helpers - getGroupingClause', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return a blank clause when no groupBy specified, irrespective of countsOnly', () => {
    const groupBy = null
    const countsOnly = [false, true]
    countsOnly.forEach(co => {
      const groupingClause = getGroupingClause(groupBy, co)

      expect(groupingClause).to.be.an.instanceOf(Object)
      expect(groupingClause).to.respondTo('toAQL')
      // noinspection BadExpressionStatementJS
      expect(groupingClause.toAQL()).to.be.empty
    })
  })

  it('should return a grouping clause when groupBy is specified, irrespective of countsOnly', () => {
    const groupBy = ['node', 'collection', 'event']
    const countsOnly = [false, true]
    const combos = cartesian({ groupBy, countsOnly })
    combos.forEach(combo => {
      const groupingClause = getGroupingClause(combo.groupBy, combo.countsOnly)

      expect(groupingClause).to.be.an.instanceOf(Object)
      expect(groupingClause).to.respondTo('toAQL')
      expect(groupingClause.toAQL()).to.match(
        new RegExp(`collect ${combo.groupBy} = .*$`, 'i')
      )
    })
  })
})

describe('Log Helpers - getReturnClause', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return a default return clause when groupBy is null, irrespective of countsOnly and sortType', () => {
    const groupBy = null
    const countsOnly = [false, true]
    const sortType = [null, 'asc', 'desc']
    const combos = cartesian({ countsOnly, sortType })
    combos.forEach(combo => {
      const returnClause = getReturnClause(
        combo.sortType,
        groupBy,
        combo.countsOnly
      )

      expect(returnClause).to.be.an.instanceOf(Object)
      expect(returnClause).to.respondTo('toAQL')
      expect(returnClause.toAQL()).include('return')
    })
  })

  it('should return a default return clause when groupBy is specified and countsOnly is true, irrespective of sortType',
    () => {
      const groupBy = ['node', 'collection', 'event']
      const countsOnly = true
      const sortType = [null, 'asc', 'desc']
      const combos = cartesian({ groupBy, sortType })
      combos.forEach(combo => {
        const returnClause = getReturnClause(
          combo.sortType,
          combo.groupBy,
          countsOnly
        )

        expect(returnClause).to.be.an.instanceOf(Object)
        expect(returnClause).to.respondTo('toAQL')
        expect(returnClause.toAQL()).include('return')
      })
    })

  it(
    'should return a sorted-group return clause when groupBy is specified and countsOnly is false, irrespective of' +
    ' sortType',
    () => {
      const groupBy = ['node', 'collection', 'event']
      const countsOnly = false
      const sortType = [null, 'asc', 'desc']
      const combos = cartesian({ groupBy, sortType })
      combos.forEach(combo => {
        const returnClause = getReturnClause(
          combo.sortType,
          combo.groupBy,
          countsOnly
        )

        expect(returnClause).to.be.an.instanceOf(Object)
        expect(returnClause).to.respondTo('toAQL')

        const aqlFragment = returnClause.toAQL()
        expect(aqlFragment).match(/events.*sort.*(asc|desc) return/)
      })
    }
  )
})
