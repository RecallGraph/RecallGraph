'use strict'

const syncOp = require('../operations/commit/sync')
const { validate, checkValidation } = require('../routes/helpers')
const { PATH_SCHEMA, TYPE_SCHEMA } = require('../routes/constants')

const providerSchemas = [PATH_SCHEMA, TYPE_SCHEMA]

function commit ({ body: { path, types } }) {
  return syncOp(path, types)
}

function commitProvider (path, types) {
  const result = validate([path, types], providerSchemas)
  checkValidation(result)

  return syncOp(...result.values)
}

module.exports = {
  commit,
  commitProvider
}
