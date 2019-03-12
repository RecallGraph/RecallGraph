'use strict';

const joi = require('joi');
const verifyCollection = require('../../middleware/verifyCollection');
const { createSingle, createMultiple } = require('../../handlers/createHandlers');
const { DB_OPS, DOC_ID_REGEX, COLL_NAME_REGEX } = require('../../helpers');
const { errors: ARANGO_ERRORS } = require('@arangodb');

const objSchema = joi
  .object()
  .keys({
    _from: joi.string().regex(DOC_ID_REGEX).required(),
    _to: joi.string().regex(DOC_ID_REGEX).required()
  })
  .unknown(true)
  .optionalKeys('_from', '_to')
  .with('_from', '_to')
  .with('_to', '_from');
const arrSchema = joi
  .array()
  .items(objSchema.required())
  .min(1);
const reqBodySchema = joi
  .alternatives()
  .try(objSchema, arrSchema)
  .required();

module.exports = (router) => {
  router.post('/:collection',
    verifyCollection,
    function (req, res) {
      let result;

      if (Array.isArray(req.body)) {
        result = createMultiple(req, req.queryParams);
      } else {
        try {
          result = createSingle(req, req.queryParams);
        } catch (e) {
          if (e.errorNum === ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code) {
            return res.throw(409, 'Document with same key already exists in collection or in history.');
          } else {
            return res.throw(500, { cause: e });
          }
        }
      }

      res.status(200).json(result);
    }, DB_OPS.INSERT)
    .pathParam('collection', joi.string().regex(COLL_NAME_REGEX).required(), 'The collection into which to add the document.')
    .queryParam('returnNew', joi.boolean().optional(), 'Whether to return the newly created object. Default `false`')
    .queryParam('silent', joi.boolean().optional(), 'Whether to return anything in the response body. Default `false`')
    .body(reqBodySchema, 'The JSON object/s to persist.')
    .response(200, ['application/json'], 'The create call succeeded.')
    .error(404, 'The collection specified does not exist.')
    .error(409, 'The specified key already exists.')
    .error(500, 'The transaction failed.')
    .summary('Create a document (vertex or edge).')
    .description('Creates a new document and adds it to the tracking index.')
    .tag('Document');

  console.log('Loaded "create" route');
};
