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

/*
 * ### restoreProvider
 * Restores deleted nodes matching the given path pattern.
 *
 * **Args:**
 * - `path` - The path pattern to pick nodes whose history should be restored.
 * - `options` - An optional object, containing any combination of the following keys:
 *    - `returnNew` - Whether to return the newly restored object. Default `false`.
 *    - `silent` - Whether to return anything in the result. Default `false`.
 *
 *
 * **Return:**
 *
 * The contents of the result returned by the method is identical to the contents of the response
 * body of the corresponding
 * [HTTP API](https://app.swaggerhub.com/apis-docs/RecallGraph/RecallGraph/1.0.0#/Document/restore),
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
 *  ```
 *  restoreProvider('/c/vertex_collection')
 *  ```
 * 1. Silent mode:
 *  ```
 *    restoreProvider('/c/vertex_collection', {
 *        silent: true
 *      }
 *    )
 *  ```
 */
function restoreProvider (path, options = {}) {
  const result = validate([path, options], providerSchemas)
  checkValidation(result)

  return restoreOp(...result.values)
}

module.exports = {
  restore,
  restoreProvider
}
