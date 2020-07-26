'use strict'

const Joi = require('joi')
const { commit } = require('../../handlers/commitHandlers')
const { PATH_SCHEMA, TYPE_SCHEMA } = require('../schemas')
const dd = require('dedent')

module.exports = router => {
  const reqBodySchema = Joi.object().keys({
    path: PATH_SCHEMA,
    types: TYPE_SCHEMA
  })

  buildEndpoint(router.put('/commit', processCommitRequest, 'commit'))
    .body(reqBodySchema, dd`
      The path pattern to pick nodes whose logs should be returned, and the optional types of nodes which should be
      committed. **Important:** This endpoint DOES NOT accept the Node-Glob scope in the path pattern.
      (e.g. \`{"path": "/c/*raw_data*", "types": ["existing"]}\`)
    `)

    .summary('Commit nodes having states that are AHEAD of the log.')

  console.debug('Loaded "commit" routes.')
}

function processCommitRequest (req, res) {
  res.status(200).json(commit(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .response(200, ['application/json'], 'The commit was successfully performed.')
    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(500, 'The operation failed.')

    .description(dd`
      Comits nodes to the event log whose states no longer match with the log.
      
      **This endpoint DOES NOT accept the Node-Glob scope in the path pattern.**
      
      Two types of commits are supported:
      
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
