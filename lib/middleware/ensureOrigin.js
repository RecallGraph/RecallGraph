'use strict';

const db = require('@arangodb').db;
const helpers = require('../helpers');
const ARANGO_ERRORS = require('@arangodb').errors;

module.exports = function ensureOrigin(req, res, next) {
  const collName = req.pathParams.collection;
  const coll = db._collection(collName);
  const eventColl = db._collection(helpers.SERVICE_COLLECTIONS.events);

  let origin = {
    _key: `origin-${coll._id}`,
    'is-origin-node': true,
    'origin-for': collName
  };
  if (!eventColl.exists(origin)) {
    let err = null;
    try {
      eventColl.insert(origin, {
        waitForSync: true,
        silent: true
      });
    } catch (e) {
      if (e.errorNum === ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code) {
        console.log(`Origin for ${collName} created elsewhere.`);
      } else {
        err = e;
      }
    } finally {
      next(err);
    }
  } else {
    next();
  }
};