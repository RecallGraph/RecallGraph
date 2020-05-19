'use strict'

const joi = require('joi')
const { purge } = require('../../../lib/handlers/purgeHandlers')
const { pathSchema } = require('../../../lib/routes/helpers')
const dd = require('dedent')

module.exports = router => {
  const reqBodySchema = joi.object().keys({
    path: pathSchema
  })

  buildEndpoint(router.delete('/purge', processPurgeRequest, 'purge'))
    .body(reqBodySchema, 'The path pattern to pick nodes whose history should be purged.')

    .summary('Purge node history.')

  console.debug('Loaded "purge" routes')
}

function processPurgeRequest (req, res) {
  res.status(200).json(purge(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam('deleteUserObjects', joi.boolean().optional(),
      'Determines whether to delete the corresponding user-defined objects. Default: `false`.')

    .queryParam('silent', joi.boolean().optional(),
      'Whether to return anything in the response body. Default `false`.')

    .response(200, ['application/json'], 'History of the specified path was successfully purged.')
    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(500, 'The operation failed.')

    .description(dd`
      Purges all history for nodes matching the given path pattern.

      Also see: https://docs.recallgraph.tech/getting-started/terminology#path
    `)

    .tag('History')
}
