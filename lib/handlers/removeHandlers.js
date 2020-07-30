'use strict'

const commit = require('../operations/commit')
const { DB_OPS: { REMOVE } } = require('../constants')
const { pick, omit, isObject } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { REMOVE_BODY_SCHEMA } = require('../routes/schemas')

const shallowOptKeys = ['returnNew', 'returnOld', 'silent']
const optionsSchema = JoiRG.object().keys({
  returnOld: JoiRG.boolean(),
  silent: JoiRG.boolean(),
  ignoreRevs: JoiRG.boolean()
})
const providerSchemas = [JoiRG.string().collection().required(), REMOVE_BODY_SCHEMA, optionsSchema]

function removeSingle ({ pathParams, body }, options, deepOpts) {
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
    REMOVE,
    shallowOpts,
    deepOpts
  )
}

function removeMultiple ({ pathParams, body }, options) {
  const shallowOpts = pick(options, shallowOptKeys)
  const deepOpts = omit(options, shallowOptKeys)
  const nodes = []

  body.forEach(node => {
    try {
      nodes.push(
        removeSingle({ pathParams, body: node }, shallowOpts, deepOpts)
      )
    } catch (e) {
      console.error(e.stack)
      nodes.push(e)
    }
  })

  return nodes
}

/*
 * ### removeProvider
 * Removes an existing document or documents and updates the tracking index.
 *
 * **Args:**
 * - `collection` - The collection from which to remove the document.
 * - `data` - An object or array of objects containing meta information of documents to be removed.
 * - `options` - An optional object, containing any combination of the following keys:
 *    - `returnOld` - Whether to return the old object. Default `false`.
 *    - `silent` - Whether to return anything in the result. Default `false`.
 *    - `ignoreRevs` - Whether to ignore a revision match before delete. Default `true`.
 *
 *
 * **Return:**
 *
 * The contents of the result returned by the method is identical to the contents of the response
 * body of the corresponding
 * [HTTP API](https://app.swaggerhub.com/apis-docs/RecallGraph/RecallGraph/1.0.0#/Document/remove),
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
 * 1. Remove a single document silently:
 *   ```
 *   removeProvider('vertex_collection',
 *     { _key: 'abc' },
 *     { silent: true }
 *   )
 *   ```
 * 1. Remove an array of documents and return the old documents (full content rather just the meta information):
 *   ```
 *   removeProvider('edge_collection', [
 *       // Perform a rev match before delete.
 *       { _key: 'abc', _rev: 'xyz' },
 *       // Non-meta content is ignored.
 *       { x: 2, y: 1, _id: 'edge_collection/def' },
 *       { _id: 'edge_collection/xyz' }
 *     ],
 *     { returnOld: true }
 *   )
 *   ```
 */
function removeProvider (collection, data, options = {}) {
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
    return removeMultiple(req, options)
  } else {
    const shallowOpts = pick(options, shallowOptKeys)
    const deepOpts = omit(options, shallowOptKeys)

    return removeSingle(req, shallowOpts, deepOpts)
  }
}

module.exports = {
  removeSingle,
  removeMultiple,
  removeProvider
}
