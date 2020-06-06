'use strict'

const Joi = require('joi')
const { restore } = require('../../handlers/restoreHandlers')
const { getCRUDErrors } = require('../helpers')
const { PATH_SCHEMA } = require('../schemas')
const { isEmpty } = require('lodash')
const dd = require('dedent')

module.exports = router => {
  const reqBodySchema = Joi.object().keys({
    path: PATH_SCHEMA
  })

  buildEndpoint(router.post('/_restore', processRestoreRequest, 'restore'))
    .body(reqBodySchema,
      'The path pattern to pick nodes which should be restored. (e.g. `{"path": "/c/*raw_data*"}`)')

    .summary('Restore nodes.')

  console.debug('Loaded "restore" routes')
}

function processRestoreRequest (req, res) {
  const result = restore(req)
  const errors = getCRUDErrors(result)

  if (isEmpty(errors)) {
    res.status(201)
  } else {
    res.setHeader('X-Arango-Error-Codes', errors)
    res.status(412)
  }

  res.json(result)
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam('returnNew', Joi.boolean(),
      'Whether to return the newly restored object. Default `false`')

    .queryParam('silent', Joi.boolean(),
      'Whether to return anything in the response body. Default `false`')

    .response(200, ['application/json'], 'The log was successfully generated.')
    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(500, 'The operation failed.')

    .description(dd`
      Restores deleted nodes matching the given path pattern.

      Also see: https://docs.recallgraph.tech/getting-started/terminology#path
    `)

    .tag('Document')
}
