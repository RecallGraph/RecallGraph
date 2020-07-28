'use strict'

const init = require('../../../helpers/util/init')
const {
  testKShortestPaths, kspHandlerWrapper
} = require('../../../helpers/history/kShortestPaths')
const { kspProvider } = require('../../../../lib/handlers/kShortestPathsHandlers')

describe('k Shortest Paths Handlers', () => {
  before(() => init.setup({ ensureFlightDataLoad: true }))

  after(init.teardown)

  it('should return k shortest paths', () => {
    testKShortestPaths(kspHandlerWrapper)
  })
})

describe('k Shortest Paths Provider', () => {
  before(() => init.setup({ ensureFlightDataLoad: true }))

  after(init.teardown)

  it('should return k shortest paths', () => {
    testKShortestPaths(kspProvider)
  })
})
