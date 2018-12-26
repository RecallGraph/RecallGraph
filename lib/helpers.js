'use strict';

const configuration = module.context.service.configuration;

exports.SERVICE_COLLECTIONS = {
  events: module.context.collectionName(configuration['event-coll-suffix']),
  commands: module.context.collectionName(configuration['command-coll-suffix']),
  snapshots: module.context.collectionName(configuration['snapshot-coll-suffix']),
  evtSSLinks: module.context.collectionName(configuration['event-snapshot-link-coll-suffix']),
  snapshotLinks: module.context.collectionName(configuration['snapshot-link-coll-suffix'])
};

exports.EVENT_TYPES = {
  INSERT: 'insert',
  REPLACE: 'replace',
  DELETE: 'delete'
};

exports.snapshotInterval = function snapshotInterval(collName) {
  const snapshotIntervals = configuration['snapshot-intervals'];
  const interval = parseInt(snapshotIntervals[collName]);

  return Number.isInteger(interval) ? interval : parseInt(snapshotIntervals._default);
};