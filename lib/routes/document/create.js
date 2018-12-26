'use strict';

const joi = require('joi');
const verifyCollection = require('../../middleware/verifyCollection');
const ensureOrigin = require('../../middleware/ensureOrigin');
const createHandlers = require('../../handlers/createHandlers');
const eventTypes = require('../../helpers').EVENT_TYPES;

const objSchema = joi.object().required();
const arrSchema = joi.array().items(objSchema).min(1).required();

module.exports = (router) => {
  router.post('/:collection',
    verifyCollection,
    ensureOrigin,
    function (req, res) {
      let result;

      if (Array.isArray(req.body)) {
        result = createHandlers.createMultiple(req);
      } else {
        result = createHandlers.createSingle(req);
      }

      res.status(201).json(result);
    }, eventTypes.INSERT)
    .pathParam('collection', joi.string().required(), 'The collection into which to add the document.')
    .body(joi.alternatives().try(objSchema, arrSchema).required(), 'The JSON object/s to persist.')
    .response(201, ['application/json'], 'The create call succeeded.')
    .error(404, 'The collection specified does not exist.')
    .error(500, 'The transaction failed.')
    .summary('Create a document (vertex or edge).')
    .description('Creates a new document and adds it to the tracking index.');

  console.log('Loaded "create" route');
};
