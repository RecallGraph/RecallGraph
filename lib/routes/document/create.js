'use strict'

const Joi = require('joi')
const verifyCollection = require('../../middleware/verifyCollection')
const { createSingle, createMultiple } = require('../../handlers/createHandlers')
const { DB_OPS: { INSERT }, COLL_NAME_REGEX } = require('../../constants')
const { isEmpty } = require('lodash')
const { getCRUDErrors } = require('../helpers')
const dd = require('dedent')
const { CREATE_BODY_SCHEMA } = require('../schemas')

module.exports = router => {
  router.post('/:collection', verifyCollection, function (req, res) {
    let result

    if (Array.isArray(req.body)) {
      result = createMultiple(req, req.queryParams)

      const errors = getCRUDErrors(result)
      if (isEmpty(errors)) {
        res.status(201)
      } else {
        res.setHeader('X-Arango-Error-Codes', errors)
        res.status(412)
      }
    } else {
      try {
        result = createSingle(req, req.queryParams)
        res.status(201)
      } catch (e) {
        console.error(e.stack)
        if (e.errorNum) {
          res.setHeader('X-Arango-Error-Codes', `${e.errorNum}:1`)
          result = e.errorMessage

          res.status(412)
        } else {
          return res.throw(500, { cause: e })
        }
      }
    }

    res.json(result)
  }, INSERT)

    .pathParam('collection', Joi.string().regex(COLL_NAME_REGEX).required(),
      'The collection into which to add the document.')

    .queryParam('returnNew', Joi.boolean(),
      'Whether to return the newly created object. Default `false`.')

    .queryParam('silent', Joi.boolean(),
      'Whether to return anything in the response body. Default `false`.')

    .body(CREATE_BODY_SCHEMA, 'The JSON object/s to persist.')
    .response(201, ['application/json'], dd`
      The create call succeeded. For multiple docs, this is returned only if **ALL** documents were successfully created.
    `)

    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(404, 'The specified collection does not exist.')
    .error(412, dd`
      One or more documents could not be created (due to a conflict or some other failed pre-condition). A header,
      \`X-Arango-Error-Codes\`, is set, which contains a map of the error codes that occurred together with their
      multiplicities, as in: 1200:17,1205:10 which means that in 17 cases the error 1200 “revision conflict” and in 10
      cases the error 1205 “illegal document handle” has happened. The error details are in the response body.
    `)

    .summary('Create a document (vertex or edge).')
    .description('Creates a new document and adds it to the tracking index.')
    .tag('Document')

  console.debug('Loaded "create" route')
}
