'use strict'

const init = require('../../../../helpers/util/init')
const { testTraverseWithParams, generateOptionCombos } = require('../../../../helpers/history/traverse')
const traverse = require('../../../../../lib/operations/traverse')

// describe('Traverse - With Filters', () => {
//   before(() => init.setup({ ensureSampleDataLoad: true }))
//
//   after(init.teardown)
//
//   it('should return collected vertex+edge sets when bfs=true', () => {
//     const combos = generateOptionCombos()
//     combos.forEach(combo => testTraverseWithParams(combo, traverse))
//   })
//
//   it('should return collected vertex+edge sets when bfs=false', () => {
//     const combos = generateOptionCombos(false)
//     combos.forEach(combo => testTraverseWithParams(combo, traverse))
//   })
// })

describe('Traverse - Without Filters', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const combos = generateOptionCombos()
    combos.forEach(combo => testTraverseWithParams(combo, traverse, false))
  })

  it('should return collected vertex+edge sets when bfs=false', () => {
    const combos = generateOptionCombos(false)
    combos.forEach(combo => testTraverseWithParams(combo, traverse, false))
  })
})
