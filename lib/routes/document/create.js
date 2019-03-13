'use strict';

const joi = require('joi');
const verifyCollection = require('../../middleware/verifyCollection');
const { createSingle, createMultiple } = require('../../handlers/createHandlers');
const { DB_OPS, DOC_ID_REGEX, COLL_NAME_REGEX } = require('../../helpers');
const { isEmpty } = require('lodash');
const { getErrors } = require('./helpers');

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

        const errors = getErrors(result);
        if (isEmpty(errors)) {
          res.status(201);
        }
        else {
          res.setHeader('X-Arango-Error-Codes', errors);
          res.status(412);
        }
      }
      else {
        try {
          result = createSingle(req, req.queryParams);
          res.status(201);
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
    }, DB_OPS.INSERT)
    .pathParam('collection', joi.string().regex(COLL_NAME_REGEX).required(),
      'The collection into which to add the document.')
    .queryParam('returnNew', joi.boolean().default(false),
      'Whether to return the newly updated object. Default `false`')
    .queryParam('silent', joi.boolean().default(false),
      'Whether to return anything in the response body. Default `false`')
    .body(reqBodySchema, 'The JSON object/s to persist.')
    .response(201, ['application/json'], 'The create call succeeded. For multiple docs, this is returned only if' +
      ' **ALL** documents were successfully created.')
    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(404, 'The specified collection does not exist.')
    .error(412, 'One or more documents could not be created (due to a conflict or some other failed pre-condition).' +
      ' A header X-Arango-Error-Codes is set, which contains a map of the error codes that occurred together with' +
      ' their multiplicities, as in: 1200:17,1205:10 which means that in 17 cases the error 1200 “revision conflict”' +
      ' and in 10 cases the error 1205 “illegal document handle” has happened. The error details are in the response' +
      ' body.')
    .summary('Create a document (vertex or edge).')
    .description('Creates a new document and adds it to the tracking index.')
    .tag('Document');

  console.log('Loaded "create" route');
};
