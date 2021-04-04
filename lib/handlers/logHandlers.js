'use strict'

const logOp = require('../operations/log')
const { omit } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { PATH_SCHEMA } = require('../routes/schemas')

const optionsSchema = JoiRG.object().keys({
  since: JoiRG.number(),
  until: JoiRG.number(),
  sort: JoiRG.string().valid('asc', 'desc'),
  skip: JoiRG.number().integer().min(0),
  limit: JoiRG.number().integer().min(0),
  groupBy: JoiRG.string().valid('node', 'collection', 'event', 'type'),
  countsOnly: JoiRG.boolean(),
  groupSort: JoiRG.string().valid('asc', 'desc'),
  groupSkip: JoiRG.number().integer().min(0),
  groupLimit: JoiRG.number().integer().min(0),
  postFilter: JoiRG.string().filter().empty('')
})

function log (req) {
  const path = req.queryParams.path || req.body.path

  const options = omit(req.queryParams, 'path', 'postFilter')
  options.postFilter = req.queryParams.postFilter || (req.body && req.body.postFilter)

  return logOp(path, options)
}

/*
 * ### logProvider
 * Returns event logs for nodes matching the given path pattern and the
 * aggregating/sorting/slicing/post-filter constraints.
 *
 * **Args:**
 * - `path` - The path pattern to pick nodes whose logs should be returned.
 * - `options` - An optional object, containing any combination of the following keys:
 *    - `since` - The unix timestamp (sec) starting from which to return events (inclusive).
 *    Precision: 0.1μs. Example: since=1581583228.2800217
 *    - `until` - The unix timestamp (sec) until which to return events (exclusive). Precision: 0.1μs.
 *    Example: until=1581583228.2800217
 *    - `sort` - The outer/primary sort order of records in the result set, sorted by
 *    `event.ctime` (`groupBy==null`) or aggregation key (`groupBy` is not `null` and `countsOnly` is `false`)
 *    or aggregated total (`groupBy` is not null and `countsOnly` is `true`). Default: `desc` for `event.ctime`
 *    or aggregated total, `asc` otherwise.
 *    - `skip` - The number records to skip/omit from the result set, starting from the first.
 *    Falsey implies none.
 *    - `limit` - The number records to keep in the result set, starting from `skip` or `0`. Falsey implies all.
 *    - `groupBy` - The parameter on which to group records in the result set. One of `node`, `collection`,
 *    `event` or `type`.
 *    - `countsOnly` - If `groupBy` is specified, this parameter determines whether to return aggregated event
 *    totals (`countsOnly==true`), or entire event lists per group (`countsOnly==false`).
 *    - `groupSort` - The inner/secondary sort order of records in a group (if `groupBy` is specified and
 *    `countsOnly` is falsey), sorted by `event.ctime`. Default: `desc`.
 *    - `groupSkip` - The number records to skip/omit from each group of the result set (if `groupBy` is
 *    specified and `countsOnly` is falsey), starting from the first. Falsey implies none.
 *    - `groupLimit` - The number records to keep in each group of the result set (if `groupBy` is specified
 *    and `countsOnly` is falsey), starting from `groupSkip` or `0`. Falsey implies all.
 *    - `postFilter` - The optional post-filter expression to apply on the log.
 *
 *
 * **Return:**
 *
 * The contents of the result returned by the method is identical to the contents of the response
 * body of the corresponding
 * [HTTP API](https://app.swaggerhub.com/apis-docs/RecallGraph/RecallGraph/1.0.0#/Event/logGet),
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
 *   logProvider('/c/vertex_collection')
 *   ```
 * 1. Grouped (by node) logs starting from a time point:
 *   ```
 *   logProvider('/c/vertex_collection', {
 *       since: 1581583228.2800217,
 *       groupBy: 'node'
 *     }
 *   )
 *   ```
 */
function logProvider (path, options = {}) {
  const result = validate([path, options], [PATH_SCHEMA, optionsSchema])
  checkValidation(result)

  return logOp(...result.values)
}

module.exports = {
  log,
  logProvider
}
