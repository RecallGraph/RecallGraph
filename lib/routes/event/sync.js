'use strict'

const joi = require('joi')
const { sync } = require('../../handlers/syncHandlers')
const { pathSchema, typeSchema } = require('../helpers')
const dd = require('dedent')

module.exports = router => {
  const reqBodySchema = joi.object().keys({
    path: pathSchema,
    types: typeSchema
  }).optionalKeys('types')

  buildEndpoint(router.put('/sync', processSyncRequest, 'sync'))
    .body(reqBodySchema, dd`
      The path pattern to pick nodes whose logs should be returned, and the optional types of nodes which should be
      synced. **Important:** This endpoint DOES NOT accept the Node-Glob scope in the path pattern.
      (e.g. \`{"path": "/c/*raw_data*", "types": ["existing"]}\`)
    `)

    .summary('One-way sync of the event log to make it catch up with nodes having states that are AHEAD of the log.')

  console.debug('Loaded "sync" routes.')
}

function processSyncRequest (req, res) {
  res.status(200).json(sync(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .response(200, ['application/json'], 'The sync was successfully performed.')
    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(500, 'The operation failed.')

    .description(dd`
      Synchronizes event log to nodes whose states no longer match with the log. This is a one-way sync operation. The
      event log follows the node states and not the other way round.
      
      **This endpoint DOES NOT accept the Node-Glob scope in the path pattern.**
      
      Two types of sync are supported:
      
      1. Existing nodes that are yet to be tracked by the event log, or are tracked but have been modified outside
        of RecallGraph's purview, and hence have gone out of sync with its event log.
      2. Tracked nodes that have been deleted through means outside of RecallGraph, and so the event log still believes
        them to exist.

      Also see:

      1. https://docs.recallgraph.tech/getting-started/terminology#event

      2. https://docs.recallgraph.tech/getting-started/terminology#path

      3. https://docs.recallgraph.tech/understanding-recallgraph/terminology#node-glob-scope
    `)

    .tag('Event')
}
