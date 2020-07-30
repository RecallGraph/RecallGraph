'use strict'

const commit = require('../operations/commit')
const { DB_OPS: { REPLACE } } = require('../constants')
const { pick, omit, isObject } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { UPDATE_BODY_SCHEMA } = require('../routes/schemas')

const shallowOptKeys = ['returnNew', 'returnOld', 'silent']
const optionsSchema = JoiRG.object().keys({
  returnNew: JoiRG.boolean(),
  returnOld: JoiRG.boolean(),
  silent: JoiRG.boolean(),
  ignoreRevs: JoiRG.boolean()
})
const providerSchemas = [JoiRG.string().collection().required(), UPDATE_BODY_SCHEMA, optionsSchema]

function replaceSingle ({ pathParams, body }, options, deepOpts) {
  let shallowOpts
  if (!isObject(deepOpts)) {
    shallowOpts = pick(options, shallowOptKeys)
    deepOpts = omit(options, shallowOptKeys)
  } else {
    shallowOpts = options
  }

  return commit(
    pathParams.collection,
    body,
    REPLACE,
    shallowOpts,
    deepOpts
  )
}

function replaceMultiple ({ pathParams, body }, options) {
  const shallowOpts = pick(options, shallowOptKeys)
  const deepOpts = omit(options, shallowOptKeys)
  const nodes = []

  body.forEach(node => {
    try {
      nodes.push(
        replaceSingle({ pathParams, body: node }, shallowOpts, deepOpts)
      )
    } catch (e) {
      console.error(e.stack)
      nodes.push(e)
    }
  })

  return nodes
}

/*
 * ### replaceProvider
 * Replaces an existing document or documents and updates the tracking index.
 *
 * **Args:**
 * - `collection` - The collection into which to replace the document.
 * - `data` - An object or array of objects containing document contents to be replaced.
 * - `options` - An optional object, containing any combination of the following keys:
 *    - `returnNew` - Whether to return the newly updated object. Default `false`.
 *    - `returnOld` - Whether to return the old object. Default `false`.
 *    - `silent` - Whether to return anything in the result. Default `false`.
 *    - `ignoreRevs` - Whether to ignore a revision match before replace. Default `true`.
 *
 *
 * **Return:**
 *
 * The contents of the result returned by the method is identical to the contents of the response
 * body of the corresponding
 * [HTTP API](https://app.swaggerhub.com/apis-docs/RecallGraph/RecallGraph/1.0.0#/Document/replace),
 * invoked with identical input, except when the method throws an error.
 * In the latter case, the error message would be identical to the error response of the HTTP call.
 *
 *
 * **Errors:**
 *
 * If `data` is a single object, then any error that occurs while executing the method is thrown back to the
 * caller.
 *
 * If, on the other hand, `data` is an array of objects, then the method always returns an array of
 * results. For every element of the `data` array which incurs an error, the error object is present at the
 * corresponding index in the result array. For every input element that the method handles successfully, the
 * result array contains an element that is identical to the result that would have been returned had the method
 * been invoked singly for this element, with identical options.
 *
 *
 * **Examples:**
 * 1. Replace a single document silently:
 *   ```
 *   replaceProvider('vertex_collection',
 *     { _key: 'abc', x: 1, y: 2 },
 *     { silent: true }
 *   )
 *   ```
 * 1. Replace an array of documents and return the new documents (full content rather just the meta information):
 *   ```
 *   replaceProvider('edge_collection', [
 *       // Perform a rev match before replace.
 *       { x: 1, y: 2, _key: 'abc', _rev: 'xyz' },
 *       { x: 2, y: 1, _id: 'edge_collection/def' },
 *       { x: 0, y: 0, _key: 'xyz', _id: 'edge_collection/xyz' }
 *     ],
 *     { returnNew: true }
 *   )
 *   ```
 */
function replaceProvider (collection, data, options = {}) {
  const result = validate([collection, data, options], providerSchemas)
  checkValidation(result)

  const args = result.values
  collection = args[0]
  data = args[1]
  options = args[2]

  const req = {
    pathParams: { collection },
    body: data
  }

  if (Array.isArray(data)) {
    return replaceMultiple(req, options)
  } else {
    const shallowOpts = pick(options, shallowOptKeys)
    const deepOpts = omit(options, shallowOptKeys)

    return replaceSingle(req, shallowOpts, deepOpts)
  }
}

module.exports = {
  replaceSingle,
  replaceMultiple,
  replaceProvider
}
