/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const { cartesian } = require('../../../../helpers/util')
const { getSortingClause, getGroupingClause, getReturnClause } = require('../../../../../lib/operations/log/helpers')
const init = require('../../../../helpers/util/init')

describe('Log Helpers - getSortingClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return an empty sort clause when groupBy is null and countsOnly is true, irrespective of sort',
    () => {
      const sort = ['asc', 'desc']
      const groupBy = null
      const countsOnly = true
      sort.forEach(st => {
        const sortingClause = getSortingClause(st, groupBy, countsOnly)

        expect(sortingClause, st).to.be.an.instanceOf(Object)
        expect(sortingClause, st).to.respondTo('toAQL')
        expect(sortingClause.toAQL(), st).to.be.empty
      })
    })

  it('should return a primary+secondary sort clause when groupBy is null and countsOnly is false, irrespective of sort',
    () => {
      const sort = ['asc', 'desc']
      const groupBy = null
      const countsOnly = false
      sort.forEach(st => {
        const sortingClause = getSortingClause(st, groupBy, countsOnly)

        expect(sortingClause, st).to.be.an.instanceOf(Object)
        expect(sortingClause, st).to.respondTo('toAQL')
        expect(sortingClause.toAQL(), st).to.be.match(/^sort \S+ (asc|desc), \S+ asc$/i)
      })
    })

  it(
    'should return a primary+secondary sort clause when groupBy is specified and countsOnly is true, irrespective of' +
    ' sort',
    () => {
      const sort = ['asc', 'desc']
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
      const sort = ['asc', 'desc']
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
        expect(sortingClause).to.respondTo('toAQL')
        expect(sortingClause.toAQL()).to.match(/^sort \S+ (desc|asc)$/i)
      })
    }
  )
})

describe('Log Helpers - getGroupingClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a blank clause when no groupBy specified and countsOnly is false', () => {
    const groupBy = null
    const countsOnly = false
    const groupingClause = getGroupingClause(groupBy, countsOnly)

    expect(groupingClause).to.be.an.instanceOf(Object)
    expect(groupingClause).to.respondTo('toAQL')
    expect(groupingClause.toAQL()).to.be.empty
  })

  it('should return a grouping clause when no groupBy specified and countsOnly is true', () => {
    const groupBy = null
    const countsOnly = true
    const groupingClause = getGroupingClause(groupBy, countsOnly)

    expect(groupingClause).to.be.an.instanceOf(Object)
    expect(groupingClause).to.respondTo('toAQL')
    expect(groupingClause.toAQL()).to.equal('collect with count into total')
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
  before(init.setup)

  after(init.teardown)

  it('should return a default return clause when groupBy is null, irrespective of other params', () => {
    const groupBy = null
    const countsOnly = [false, true]
    const groupSort = ['asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 1]
    const combos = cartesian({ countsOnly, groupSort, groupSkip, groupLimit })
    combos.forEach(combo => {
      const returnClause = getReturnClause(
        groupBy,
        combo.countsOnly,
        combo.groupSort,
        combo.groupSkip,
        combo.groupLimit
      )

      expect(returnClause).to.be.an.instanceOf(Object)
      expect(returnClause).to.respondTo('toAQL')
      expect(returnClause.toAQL()).include('return')
    })
  })

  it('should return a default return clause when groupBy is specified and countsOnly is true, irrespective of other' +
     ' params',
  () => {
    const groupBy = ['node', 'collection', 'event']
    const countsOnly = true
    const groupSort = ['asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 1]
    const combos = cartesian({ groupBy, groupSort, groupSkip, groupLimit })
    combos.forEach(combo => {
      const returnClause = getReturnClause(
        combo.groupBy,
        countsOnly,
        combo.groupSort,
        combo.groupSkip,
        combo.groupLimit
      )

      expect(returnClause).to.be.an.instanceOf(Object)
      expect(returnClause).to.respondTo('toAQL')
      expect(returnClause.toAQL()).include('return')
    })
  })

  it(
    'should return a groupwise-sorted return clause when groupBy is specified and countsOnly is false',
    () => {
      const groupBy = ['node', 'collection', 'event']
      const countsOnly = false
      const groupSort = ['asc', 'desc']
      const groupSkip = [0, 1]
      const groupLimit = [0, 1]
      const combos = cartesian({ groupBy, groupSort, groupSkip, groupLimit })
      combos.forEach(combo => {
        const returnClause = getReturnClause(
          combo.groupBy,
          countsOnly,
          combo.groupSort,
          combo.groupSkip,
          combo.groupLimit
        )

        expect(returnClause).to.be.an.instanceOf(Object)
        expect(returnClause).to.have.property('query')
        expect(returnClause.query).match(/events.*sort.*(asc|desc).*(limit.*)?return/)
      })
    }
  )
})
