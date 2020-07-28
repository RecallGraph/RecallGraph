'use strict'

const purgeOp = require('../operations/purge')
const { PATH_SCHEMA } = require('../routes/schemas')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')

const optionsSchema = JoiRG.object().keys({
  deleteUserObjects: JoiRG.boolean(),
  silent: JoiRG.boolean()
})
const providerSchemas = [PATH_SCHEMA, optionsSchema]

function purge (req) {
  return purgeOp(req.body.path, req.queryParams)
}

// This function deletes ALL history of the given path. If deleteUserObjects is true, it also
// deletes the corresponding objects from the plain collections (holding the current state)
// ```
// purgeProvider('/c/vertex_collection', { deleteUserObjects: true, silent: false })`
// ```
function purgeProvider (path, options = {}) {
  const result = validate([path, options], providerSchemas)
  checkValidation(result)

  return purgeOp(...result.values)
}

module.exports = {
  purge,
  purgeProvider
}
