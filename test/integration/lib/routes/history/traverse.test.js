'use strict'

const init = require('../../../../helpers/init')
const {
  testTraverseWithParams, generateOptionCombos, traversePostWrapper
} = require('../../../../helpers/history/traverse')

describe('Routes - traverse (with filters)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const combos = generateOptionCombos()
    combos.forEach(combo => testTraverseWithParams(combo, traversePostWrapper))
  })

  it('should return collected vertex+edge sets when bfs=false', () => {
    const combos = generateOptionCombos(false)
    combos.forEach(combo => testTraverseWithParams(combo, traversePostWrapper))
  })
})

describe('Routes - traverse (without filters)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const combos = generateOptionCombos()
    combos.forEach(combo => testTraverseWithParams(combo, traversePostWrapper, false))
  })

  it('should return collected vertex+edge sets when bfs=false', () => {
    const combos = generateOptionCombos(false)
    combos.forEach(combo => testTraverseWithParams(combo, traversePostWrapper, false))
  })
})
