'use strict'

const commit = require('../operations/commit')
const { DB_OPS: { INSERT } } = require('../constants')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { CREATE_BODY_SCHEMA } = require('../routes/schemas')

const optionsSchema = JoiRG.object().keys({
  returnNew: JoiRG.boolean(),
  silent: JoiRG.boolean()
})
const providerSchemas = [JoiRG.string().collection().required(), CREATE_BODY_SCHEMA, optionsSchema]

function createSingle ({ pathParams, body }, options) {
  return commit(pathParams.collection, body, INSERT, options)
}

function createMultiple ({ pathParams, body }, options) {
  const nodes = []
  body.forEach(node => {
    try {
      nodes.push(createSingle({ pathParams, body: node }, options))
    } catch (e) {
      console.error(e.stack)
      nodes.push(e)
    }
  })

  return nodes
}

/*
 * ### createProvider
 * Creates a new document and adds it to the tracking index.
 *
 * **Args:**
 * - `collection` - The collection into which to add the document.
 * - `data` - An object or array of objects containing document contents to be saved.
 * - `options` - An optional object, containing any combination of the following keys:
 *    - `returnNew` - Whether to return the newly created object. Default `false`.
 *    - `silent` - Whether to return anything in the result. Default `false`.
 *
 *
 * **Return:**
 *
 * The contents of the result returned by the method is identical to the contents of the response
 * body of the corresponding
 * [HTTP API](https://app.swaggerhub.com/apis-docs/RecallGraph/RecallGraph/1.0.0#/Document/insert),
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
 * 1. Create a single document silently:
 *   ```
 *   createProvider('vertex_collection',
 *     { x: 1, y: 2 },
 *     { silent: true }
 *   )
 *   ```
 * 1. Create an array of documents and return the new documents (full content rather just the meta information):
 *   ```
 *   createProvider('edge_collection', [
 *       { x: 1, y: 2 },
 *       { x: 0, y: 1, _key: 'abc' },
 *       { x: 2, y: 1, _id: 'edge_collection/def' },
 *       { x: 0, y: 0, _key: 'xyz', _id: 'edge_collection/xyz' }
 *     ],
 *     { returnNew: true }
 *   )
 *   ```
 */
function createProvider (collection, data, options = {}) {
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
    return createMultiple(req, options)
  } else {
    return createSingle(req, options)
  }
}

module.exports = {
  createSingle,
  createMultiple,
  createProvider
}
