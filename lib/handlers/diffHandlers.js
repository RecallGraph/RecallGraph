'use strict'

const diffOp = require('../operations/diff')
const { omit } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { PATH_SCHEMA } = require('../routes/schemas')

const optionsSchema = JoiRG.object().keys({
  since: JoiRG.number(),
  until: JoiRG.number(),
  sort: JoiRG.string().valid('asc', 'desc'),
  skip: JoiRG.number().integer().min(0),
  limit: JoiRG.number().integer().min(0),
  reverse: JoiRG.boolean(),
  postFilter: JoiRG.string().filter().empty('')
})
const providerSchemas = [PATH_SCHEMA, optionsSchema]

function diff (req) {
  const path = req.queryParams.path || req.body.path

  const options = omit(req.queryParams, 'path', 'postFilter')
  options.postFilter = req.queryParams.postFilter || (req.body && req.body.postFilter)

  return diffOp(path, options)
}

/*
 * ### diffProvider
 * Returns diffs for nodes matching the given path pattern and the sorting/slicing/post-filter constraints.
 *
 * **Args:**
 * - `path` - The path pattern to pick nodes whose diffs should be returned.
 * - `options` - An optional object, containing any combination of the following keys:
 *    - `since` - The unix timestamp (sec) for the earliest matching event from which to start fetching diffs
 *    (inclusive). Precision: 0.1μs. Example: since=1581583228.2800217
 *    - `until` - The unix timestamp (sec) for the latest matching event until which to keep fetching diffs
 *    (exclusive). Precision: 0.1μs. Example: until=1581583228.2800217
 *    - `sort` - The primary sort order of records in the result set, sorted by node ID. Default: `asc`.
 *    - `skip` - The number records to skip/omit from the result set, starting from the first. Falsey implies
 *    none.
 *    - `limit` - The number records to keep in the result set, starting from `skip` or `0`. Falsey implies all.
 *    - `reverse` - Whether to invert the individual diffs, so that they can be applied in reverse order. This
 *    also reverses the order of diffs within a node.
 *    - `postFilter` - The post-filter expression to apply on the diff result.
 *
 *
 * **Return:**
 *
 * The contents of the result returned by the method is identical to the contents of the response
 * body of the corresponding
 * [HTTP API](https://app.swaggerhub.com/apis-docs/RecallGraph/RecallGraph/1.0.0#/Event/diffGet),
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
 *   diffProvider('/c/vertex_collection')
 *   ```
 * 1. Reversed diffs starting from a time point:
 *   ```
 *   diffProvider('/c/vertex_collection', {
 *       since: 1581583228.2800217,
 *       reverse: true
 *     }
 *   )
 *   ```
 */
function diffProvider (path, options = {}) {
  const result = validate([path, options], providerSchemas)
  checkValidation(result)

  return diffOp(...result.values)
}

module.exports = {
  diff,
  diffProvider
}
