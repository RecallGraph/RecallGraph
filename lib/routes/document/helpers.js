'use strict';

const db = require('@arangodb').db;

const configuration = module.context.service.configuration;

exports.verifyCollection = function verifyCollection(req, res, next) {
  const collName = req.pathParams.collection;
  const coll = db._collection(collName);
  if (!coll) {
    return res.throw(404, `Collection '${collName}' does not exist in DB.`);
  }

  next();
};

exports.snapshotInterval = function snapshotInterval(collName) {
  const snapshotIntervals = configuration['snapshot-intervals'];
  const intervalStr = snapshotIntervals[collName] || snapshotIntervals._default;

  return parseInt(intervalStr, 10);
};

exports.serviceCollections = {
  events: module.context.collectionName(configuration['event-coll-suffix']),
  commands: module.context.collectionName(configuration['command-coll-suffix']),
  snapshots: module.context.collectionName(configuration['snapshot-coll-suffix']),
  evtSSLinks: module.context.collectionName(configuration['event-snapshot-link-coll-suffix']),
  snapshotLinks: module.context.collectionName(configuration['snapshot-link-coll-suffix'])
};