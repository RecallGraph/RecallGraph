'use strict'

const init = require('../../../../helpers/util/init')
const {
  testKShortestPaths, kspPostWrapper
} = require('../../../../helpers/history/kShortestPaths')

describe('k Shortest Paths', () => {
  before(() => init.setup({ ensureFlightDataLoad: true }))

  after(init.teardown)

  it('should return k shortest paths', () => {
    testKShortestPaths(kspPostWrapper)
  })
})
