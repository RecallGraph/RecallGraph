'use strict'

const init = require('../../../helpers/util/init')
const {
  testKShortestPaths, kspHandlerWrapper
} = require('../../../helpers/history/kShortestPaths')

describe('k Shortest Paths', () => {
  before(() => init.setup({ ensureFlightDataLoad: true }))

  after(init.teardown)

  it('should return k shortest paths', () => {
    testKShortestPaths(kspHandlerWrapper)
  })
})
