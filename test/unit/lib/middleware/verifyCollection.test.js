/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../helpers/init')
const verifyCollection = require('../../../../lib/middleware/verifyCollection')

describe('Middleware - verifyCollection', () => {
  before(init.setup)

  after(init.teardown)

  it('should return with no error for an existing collection', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const pathParams = {
      collection: collName
    }
    const throwHandler = expect.fail

    verifyCollection({ pathParams }, { throw: throwHandler }, err => {
      // noinspection BadExpressionStatementJS
      expect(err).to.not.exist
    })
  })

  it('should throw error for a non-existing collection', () => {
    const pathParams = {
      collection: 'does-not-exist'
    }
    const throwHandler = (errNum, errMsg) => {
      expect(errNum).to.equal(404)
      // noinspection BadExpressionStatementJS
      expect(errMsg).to.be.not.empty
    }

    verifyCollection({ pathParams }, { throw: throwHandler }, err => {
      expect(err).to.be.an.instanceOf(Error)
    })
  })
})
