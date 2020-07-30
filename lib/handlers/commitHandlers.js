'use strict'

const syncOp = require('../operations/commit/sync')
const { validate, checkValidation } = require('../routes/helpers')
const { PATH_SCHEMA, TYPE_SCHEMA } = require('../routes/schemas')

const providerSchemas = [PATH_SCHEMA, TYPE_SCHEMA]

function commit ({ body: { path, types } }) {
  return syncOp(path, types)
}

/*
 * ### commitProvider
 * Commits nodes to the event log whose states no longer match with the log.
 *
 * **This endpoint DOES NOT accept the Node-Glob scope in the path pattern.**
 *
 * Two types of commits are supported:
 *
 * 1. Existing nodes that are yet to be tracked by the event log, or are tracked but have been modified outside
 * of RecallGraph's purview, and hence have gone out of sync with its event log.
 * 2. Tracked nodes that have been deleted through means outside of RecallGraph, and so the event log still
 * believes them to exist.
 *
 *
 * **Args:**
 * - `path` - The path pattern to pick nodes which should be committed.
 * - `types` - An optional array having one or both of the values `existing` and `deleted`. This decides the
 * type of commit to be processed. If omitted, both types are processed.
 *
 *
 * **Examples:**
 * 1. Default - process both types:
 *  ```
 *  commitProvider('/c/vertex_collection')
 *  ```
 * 1. Only process the _deleted_ type:
 *  ```
 *  commitProvider('/c/vertex_collection', ['deleted'])
 *  ```
 */
function commitProvider (path, types) {
  const result = validate([path, types], providerSchemas)
  checkValidation(result)

  return syncOp(...result.values)
}

module.exports = {
  commit,
  commitProvider
}
