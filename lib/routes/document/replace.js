'use strict';

const joi = require('joi');
const verifyCollection = require('../../middleware/verifyCollection');
const { replaceSingle, replaceMultiple } = require('../../handlers/replaceHandlers');
const { DB_OPS, DOC_ID_REGEX, COLL_NAME_REGEX, DOC_KEY_REGEX } = require('../../helpers');
const { errors: ARANGO_ERRORS } = require('@arangodb');

const objSchema = joi
  .object()
  .keys({
    _key: joi.string().regex(DOC_KEY_REGEX).required(),
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
  router.put('/:collection',
    verifyCollection,
    function (req, res) {
      let result;

      if (Array.isArray(req.body)) {
        result = replaceMultiple(req, req.queryParams);
      } else {
        try {
          result = replaceSingle(req, req.queryParams);
        } catch (e) {
          if (e.errorNum === ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code) {
            return res.throw(404, 'Document with specified key does not exist in collection');
          } else {
            return res.throw(500, { cause: e });
          }
        }
      }

      res.status(200).json(result);
    }, DB_OPS.REPLACE)
    .pathParam('collection', joi.string().regex(COLL_NAME_REGEX).required(), 'The collection into which to replace the document.')
    .queryParam('returnNew', joi.boolean().optional(), 'Whether to return the newly updated object.')
    .queryParam('returnOld', joi.boolean().optional(), 'Whether to return the old object.')
    .queryParam('silent', joi.boolean().optional(), 'Whether to return anything in the response body.')
    .body(reqBodySchema, 'The JSON object/s to persist.')
    .response(200, ['application/json'], 'The replace call succeeded.')
    .error(404, 'The collection/document specified does not exist.')
    .error(500, 'The transaction failed.')
    .summary('Replace a document or documents (vertex or edge).')
    .description('Replaces an existing document or documents and updates the tracking index.');

  console.log('Loaded "replace" route');
};
