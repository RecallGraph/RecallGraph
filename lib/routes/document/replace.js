'use strict';

const joi = require('joi');
const verifyCollection = require('../../middleware/verifyCollection');
const ensureOrigin = require('../../middleware/ensureOrigin');
const replaceHandlers = require('../../handlers/replaceHandlers');
const DB_OPS = require('../../helpers').DB_OPS;

const objSchema = joi.object().keys({
  _key: joi.string().required()
}).unknown().required();
const arrSchema = joi.array().items(objSchema).min(1).required();

module.exports = (router) => {
  router.put('/:collection',
    verifyCollection,
    ensureOrigin,
    function (req, res) {
      let result;

      if (Array.isArray(req.body)) {
        result = replaceHandlers.replaceMultiple(req);
      } else {
        result = replaceHandlers.replaceSingle(req);
      }

      res.status(200).json(result);
    }, DB_OPS.REPLACE)
    .pathParam('collection', joi.string().required(), 'The collection into which to replace the document.')
    .body(joi.alternatives().try(objSchema, arrSchema).required(), 'The JSON object/s to persist.')
    .response(200, ['application/json'], 'The replace call succeeded.')
    .error(404, 'The collection specified does not exist.')
    .error(500, 'The transaction failed.')
    .summary('Replace a document or documents (vertex or edge).')
    .description('Replaces an existing document or documents and updates the tracking index.');

  console.log('Loaded "replace" route');
};
