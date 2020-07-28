'use strict'

const init = require('../../../helpers/util/init')
const {
  testTraverseWithParams, generateOptionCombos, traverseHandlerWrapper
} = require('../../../helpers/history/traverse')
const { traverseProvider } = require('../../../../lib/handlers/traverseHandlers')

describe('Traverse Handlers - With Filters', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const combos = generateOptionCombos()
    combos.forEach(combo => testTraverseWithParams(combo, traverseHandlerWrapper))
  })

  it('should return collected vertex+edge sets when bfs=false', () => {
    const combos = generateOptionCombos(false)
    combos.forEach(combo => testTraverseWithParams(combo, traverseHandlerWrapper))
  })
})

describe('Traverse Handlers - Without Filters', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const combos = generateOptionCombos()
    combos.forEach(combo => testTraverseWithParams(combo, traverseHandlerWrapper, false))
  })

  it('should return collected vertex+edge sets when bfs=false', () => {
    const combos = generateOptionCombos(false)
    combos.forEach(combo => testTraverseWithParams(combo, traverseHandlerWrapper, false))
  })
})

describe('Traverse Provider - With Filters', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const combos = generateOptionCombos()
    combos.forEach(combo => testTraverseWithParams(combo, traverseProvider))
  })

  it('should return collected vertex+edge sets when bfs=false', () => {
    const combos = generateOptionCombos(false)
    combos.forEach(combo => testTraverseWithParams(combo, traverseProvider))
  })
})

describe('Traverse Provider - Without Filters', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collected vertex+edge sets when bfs=true', () => {
    const combos = generateOptionCombos()
    combos.forEach(combo => testTraverseWithParams(combo, traverseProvider, false))
  })

  it('should return collected vertex+edge sets when bfs=false', () => {
    const combos = generateOptionCombos(false)
    combos.forEach(combo => testTraverseWithParams(combo, traverseProvider, false))
  })
})
