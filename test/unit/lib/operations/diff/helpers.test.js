/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/init')
const { getGroupingClause, getReturnClause } = require('../../../../../lib/operations/diff/helpers')
const { cartesian } = require('../../../../helpers/event')

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
      const groupBy = ['node']
      const reverse = [true, false]
      const combos = cartesian({ groupBy, reverse })
      combos.forEach(combo => {
        const returnClause = getReturnClause(combo.reverse)

        expect(returnClause).to.be.an.instanceOf(Object)
        expect(returnClause).to.have.property('query')
        expect(returnClause.query).match(/events.*sort.*(asc|desc).*return/)
      })
    }
  )
})

describe('Diff Helpers - extractDiffs', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return a groupwise-sorted return clause',
    () => {
      const groupBy = ['node']
      const reverse = [true, false]
      const combos = cartesian({ groupBy, reverse })
      combos.forEach(combo => {
        const returnClause = getReturnClause(combo.reverse)

        expect(returnClause).to.be.an.instanceOf(Object)
        expect(returnClause).to.have.property('query')
        expect(returnClause.query).match(/events.*sort.*(asc|desc).*return/)
      })
    }
  )
})
