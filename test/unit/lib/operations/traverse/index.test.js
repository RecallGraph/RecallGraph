'use strict'

const init = require('../../../../helpers/init')
const { testTraverseWithParams, generateOptionCombos } = require('../../../../helpers/history/traverse')

describe('Skeleton Graph - Traverse with filters', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const combos = generateOptionCombos()
    combos.forEach(combo => testTraverseWithParams(combo))
  })

  it('should return collected vertex+edge sets when bfs=false', () => {
    const combos = generateOptionCombos(false)
    combos.forEach(combo => testTraverseWithParams(combo))
  })
})

describe('Skeleton Graph - Traverse without filters', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const combos = generateOptionCombos()
    combos.forEach(combo => testTraverseWithParams(combo, false))
  })

  it('should return collected vertex+edge sets when bfs=false', () => {
    const combos = generateOptionCombos(false)
    combos.forEach(combo => testTraverseWithParams(combo, false))
  })
})
