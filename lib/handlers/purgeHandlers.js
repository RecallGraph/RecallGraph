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

/*
 * ### purgeProvider
 * Purges all history for nodes matching the given path pattern. All event logs, snapshots and structural history
 * is purged from the service collections for the selected nodes. Optionally, the actual objects whose event
 * records are being purged can also be deleted.
 *
 * **Args:**
 * - `path` - The path pattern to pick nodes whose history should be purged.
 * - `options` - An optional object, containing any combination of the following keys:
 *    - `deleteUserObjects` - Determines whether to delete the corresponding user-defined objects.
 *    Default: `false`.
 *    - `silent` - Whether to return anything in the result. Default `false`.
 *
 *
 * **Return:**
 *
 * The contents of the result returned by the method is identical to the contents of the response
 * body of the corresponding
 * [HTTP API](https://app.swaggerhub.com/apis-docs/RecallGraph/RecallGraph/1.0.0#/History/purge),
 * invoked with identical input, except when the method throws an error.
 * In the latter case, the error message would be identical to the error response of the HTTP call.
 *
 *
 * **Errors:**
 *
 * Any error that occurs while executing the method is thrown back to the caller.
 *
 *
 * **Examples:**
 * 1. Default options:
 *   ```
 *   purgeProvider('/c/vertex_collection')
 *   ```
 * 1. Delete user objects along with purge:
 *   ```
 *   purgeProvider('/c/vertex_collection', {
 *       deleteUserObjects: true
 *     }
 *   )
 *   ```
 */
function purgeProvider (path, options = {}) {
  const result = validate([path, options], providerSchemas)
  checkValidation(result)

  return purgeOp(...result.values)
}

module.exports = {
  purge,
  purgeProvider
}
