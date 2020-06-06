'use strict'

const restoreOp = require('../operations/restore')
const { PATH_SCHEMA } = require('../routes/schemas')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')

const optionsSchema = JoiRG.object().keys({
  returnNew: JoiRG.boolean(),
  silent: JoiRG.boolean()
})
const providerSchemas = [PATH_SCHEMA, optionsSchema]

function restore ({ body: { path }, queryParams }) {
  return restoreOp(path, queryParams)
}

function restoreProvider (path, options = {}) {
  const result = validate([path, options], providerSchemas)
  checkValidation(result)

  return restoreOp(...result.values)
}

module.exports = {
  restore,
  restoreProvider
}
