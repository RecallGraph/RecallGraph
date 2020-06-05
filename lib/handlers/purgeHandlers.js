'use strict'

const purgeOp = require('../operations/purge')
const { PATH_SCHEMA } = require('../routes/constants')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')

const optionsSchema = JoiRG.object().keys({
  deleteUserObjects: JoiRG.boolean(),
  silent: JoiRG.boolean()
})
const providerSchemas = [PATH_SCHEMA, optionsSchema]

function purge (req) {
  return purgeOp(req.body.path, req.queryParams)
}

function purgeProvider (path, options = {}) {
  const result = validate([path, options], providerSchemas)
  checkValidation(result)

  return purgeOp(...result.values)
}

module.exports = {
  purge,
  purgeProvider
}
