'use strict'

const Joi = require('joi')
const verifyCollection = require('../../middleware/verifyCollection')
const { updateSingle, updateMultiple } = require('../../handlers/updateHandlers')
const { DB_OPS: { UPDATE }, COLL_NAME_REGEX } = require('../../constants')
const { UPDATE_BODY_SCHEMA } = require('../schemas')
const { isEmpty } = require('lodash')
const { getCRUDErrors } = require('../helpers')
const dd = require('dedent')

module.exports = router => {
  router.patch('/:collection', verifyCollection, function (req, res) {
    let result

    if (Array.isArray(req.body)) {
      result = updateMultiple(req, req.queryParams)

      const errors = getCRUDErrors(result)
      if (isEmpty(errors)) {
        res.status(200)
      } else {
        res.setHeader('X-Arango-Error-Codes', errors)
        res.status(412)
      }
    } else {
      try {
        result = updateSingle(req, req.queryParams)
        res.status(200)
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
  }, UPDATE)

    .pathParam('collection', Joi.string().regex(COLL_NAME_REGEX).required(),
      'The collection into which to update the document.')

    .queryParam('returnNew', Joi.boolean(),
      'Whether to return the newly updated object. Default `false`.')

    .queryParam('returnOld', Joi.boolean(), 'Whether to return the old object. Default `false`.')

    .queryParam('silent', Joi.boolean(),
      'Whether to return anything in the response body. Default `false`.')

    .queryParam('ignoreRevs', Joi.boolean(),
      'Whether to ignore a revision match before update. Default `true`.')

    .queryParam('keepNull', Joi.boolean(), 'Whether to keep keys with null values. Default `true`.')

    .queryParam('mergeObjects', Joi.boolean(),
      'Whether to merge objects instead of replacing them. Default `true`.')

    .body(UPDATE_BODY_SCHEMA, 'The JSON object/s to persist.')
    .response(200, ['application/json'], dd`
      The update call succeeded. For multiple docs, this is returned only if **ALL** documents were successfully updated.
    `)

    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(404, 'The specified collection does not exist.')
    .error(412, dd`
      One or more documents could not be updated (due to a conflict or some other failed pre-condition). A header,
      \`X-Arango-Error-Codes\`, is set, which contains a map of the error codes that occurred together with their
      multiplicities, as in: 1200:17,1205:10 which means that in 17 cases the error 1200 “revision conflict” and in 10
      cases the error 1205 “illegal document handle” has happened. The error details are in the response body.
    `)

    .summary('Update a document or documents (vertex or edge).')
    .description('Updates an existing document or documents and updates the tracking index.')
    .tag('Document')

  console.debug('Loaded "update" route')
}
