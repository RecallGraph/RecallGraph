'use strict'

const showOp = require('../operations/show')
const { omit } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { PATH_SCHEMA } = require('../routes/schemas')

const optionsSchema = JoiRG.object().keys({
  sort: JoiRG.string().valid('asc', 'desc'),
  skip: JoiRG.number().integer().min(0),
  limit: JoiRG.number().integer().min(0),
  groupBy: JoiRG.string().valid('collection', 'type'),
  countsOnly: JoiRG.boolean(),
  groupSort: JoiRG.string().valid('asc', 'desc'),
  groupSkip: JoiRG.number().integer().min(0),
  groupLimit: JoiRG.number().integer().min(0),
  postFilter: JoiRG.string().filter().empty('')
})

function show (req) {
  const path = req.queryParams.path || req.body.path
  const { timestamp } = req.queryParams

  const options = omit(req.queryParams, 'path', 'timestamp', 'postFilter')
  options.postFilter = req.queryParams.postFilter || (req.body && req.body.postFilter)

  return showOp(path, timestamp, options)
}

/*
 * ### showProvider
 * Returns past states for nodes matching the given path pattern and the
 * aggregating/sorting/slicing/post-filter constraints.
 *
 * **Args:**
 * - `path` - The path pattern to pick nodes whose states should be returned.
 * - `timestamp` - The unix timestamp (sec) for which to show node states. Precision: 0.1μs.
 *    Example: since=1581583228.2800217. Default: Current Time
 * - `options` - An optional object, containing any combination of the following keys:
 *    - `sort` - The outer/primary sort order of records in the result set. When `groupBy` is not `null` and
 *    `countsOnly` is true, it is sorted first by the aggregated total in the given sort direction, then by
 *    the group key (`asc"`). When `countsOnly` is false, it sorts by group key (`groupBy` != `null`) or node
 *    ID (`groupBy` == `null`) in the given the sort direction. Default: `desc` when countsOnly is true,
 *    `asc` otherwise.
 *    - `skip` - The number records to skip/omit from the result set, starting from the first.
 *    Falsey implies none.
 *    - `limit` - The number records to keep in the result set, starting from `skip` or `0`. Falsey implies all.
 *    - `groupBy` - The parameter on which to group records in the result set. One of `collection` or `type`.
 *    - `countsOnly` - Determines whether to return aggregated event totals (grouped or overall depending on
 *    `groupBy`), or entire event lists.
 *    - `groupSort` - The inner/secondary sort order of records in a group (if `groupBy` is specified and
 *    `countsOnly` is falsey), sorted by `_id`. Default: `asc`.
 *    - `groupSkip` - The number records to skip/omit from each group of the result set (if `groupBy` is
 *    specified and `countsOnly` is falsey), starting from the first. Falsey implies none.
 *    - `groupLimit` - The number records to keep in each group of the result set (if `groupBy` is specified
 *    and `countsOnly` is falsey), starting from `groupSkip` or `0`. Falsey implies all.
 *    - `postFilter` - The optional post-filter expression to apply on the result.
 *
 *
 * **Return:**
 *
 * The contents of the result returned by the method is identical to the contents of the response
 * body of the corresponding
 * [HTTP API](https://app.swaggerhub.com/apis-docs/RecallGraph/RecallGraph/1.0.0#/History/showGet),
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
 *   showProvider('/c/vertex_collection')
 *   ```
 * 1. Grouped (by type) nodes at a time point:
 *   ```
 *   showProvider('/c/vertex_collection', 1581583228.2800217, {
 *       groupBy: 'type'
 *     }
 *   )
 *   ```
 */
function showProvider (path, timestamp, options = {}) {
  const result = validate([path, timestamp, options], [PATH_SCHEMA, JoiRG.number(), optionsSchema])
  checkValidation(result)

  return showOp(...result.values)
}

module.exports = {
  show,
  showProvider
}
