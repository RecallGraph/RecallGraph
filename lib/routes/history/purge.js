'use strict'

const joi = require('joi')
const { purge } = require('../../../lib/handlers/purgeHandlers')
const { PATH_SCHEMA } = require('../constants')
const dd = require('dedent')

module.exports = router => {
  const reqBodySchema = joi.object().keys({
    path: PATH_SCHEMA
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
      Purges all history for nodes matching the given path pattern. All event logs, snapshots and structural history
      is purged from the service collections for the selected nodes. Optionally, the actual objects whose event records
      are being purged can also be deleted.
      
      It should be noted that the service collection entries are all cleared in a single transaction. This is fine
      when the number of nodes selected is small (which is how 'purge' is intended to be used). For a large number of
      nodes, the database might hit a transaction memory limit, throwing an error. This will cause it to rollback the
      entire transaction giving the user a chance to retry with a smaller selection.
      
      However, depending on the DB engine in use, and certain engine-specific configurations, the transaction may be
      internally broken into smaller sub-transactions which are independently committed. If there is a system crash
      between two such sub-transactions, the service collections may end up in a overall inconsistent state. To avoid
      such an eventuality, take careful note of these configuration parameters and the expected size of nodes to be 
      purged in a single call. **See the documentation linked below.**
      
      _If target objects (the user-defined objects for which the event logs were purged) are also marked for deletion,
      they are deleted outside the transaction boundary._

      Also see:
      
      1. https://docs.recallgraph.tech/getting-started/terminology#path
      2. https://www.arangodb.com/docs/stable/transactions-limitations.html
    `)

    .tag('History')
}
