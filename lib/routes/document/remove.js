'use strict';

const joi = require('joi');
const verifyCollection = require('../../middleware/verifyCollection');
const { removeSingle, removeMultiple } = require('../../handlers/removeHandlers');
const { DB_OPS, COLL_NAME_REGEX, DOC_KEY_REGEX, DOC_ID_REGEX } = require('../../helpers');
const { isEmpty } = require('lodash');
const { getCRUDErrors } = require('../helpers');

const objSchema = joi
  .object()
  .keys({
    _key: joi.string().regex(DOC_KEY_REGEX).required(),
    _id: joi.string().regex(DOC_ID_REGEX).required()
  })
  .unknown(true)
  .or('_key', '_id')
  .optionalKeys('_key', '_id');
const arrSchema = joi
  .array()
  .items(objSchema.required())
  .min(1);
const reqBodySchema = joi
  .alternatives()
  .try(objSchema, arrSchema)
  .required();

module.exports = (router) => {
  router.delete('/:collection',
    verifyCollection,
    function (req, res) {
      let result;

      if (Array.isArray(req.body)) {
        result = removeMultiple(req, req.queryParams);

        const errors = getCRUDErrors(result);
        if (isEmpty(errors)) {
          res.status(200);
        }
        else {
          res.setHeader('X-Arango-Error-Codes', errors);
          res.status(412);
        }
      }
      else {
        try {
          result = removeSingle(req, req.queryParams);
          res.status(200);
        }
        catch (e) {
          if (e.errorNum) {
            res.setHeader('X-Arango-Error-Codes', `${e.errorNum}:1`);
            result = e.errorMessage;

            res.status(412);
          }
          else {
            return res.throw(500, { cause: e });
          }
        }
      }

      res.json(result);
    }, DB_OPS.REMOVE)
    .pathParam('collection', joi.string().regex(COLL_NAME_REGEX).required(),
      'The collection from which to remove the document.')
    .queryParam('returnOld', joi.boolean().default(false), 'Whether to return the old object. Default `false`')
    .queryParam('silent', joi.boolean().default(false),
      'Whether to return anything in the response body. Default `false`')
    .queryParam('ignoreRevs', joi.boolean().default(true),
      'Whether to ignore a revision match before delete. Default `true`')
    .body(reqBodySchema, 'The JSON object/s to delete.')
    .response(200, ['application/json'], 'The remove call succeeded. For multiple docs, this is returned only if' +
      ' **ALL** documents were successfully removed.')
    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(404, 'The specified collection does not exist.')
    .error(412, 'One or more documents could not be removed (due to a conflict or some other failed pre-condition).' +
      ' A header X-Arango-Error-Codes is set, which contains a map of the error codes that occurred together with' +
      ' their multiplicities, as in: 1200:17,1205:10 which means that in 17 cases the error 1200 “revision conflict”' +
      ' and in 10 cases the error 1205 “illegal document handle” has happened. The error details are in the response' +
      ' body.')
    .summary('Remove a document or documents (vertex or edge).')
    .description('Removes an existing document or documents and updates the tracking index.')
    .tag('Document');

  console.log('Loaded "remove" route');
};
