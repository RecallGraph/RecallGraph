'use strict';

const configuration = module.context.service.configuration;

exports.serviceCollections = {
  events: module.context.collectionName(configuration['event-coll-suffix']),
  commands: module.context.collectionName(configuration['command-coll-suffix']),
  snapshots: module.context.collectionName(configuration['snapshot-coll-suffix']),
  evtSSLinks: module.context.collectionName(configuration['event-snapshot-link-coll-suffix']),
  snapshotLinks: module.context.collectionName(configuration['snapshot-link-coll-suffix'])
};

exports.snapshotInterval = function snapshotInterval(collName) {
  const snapshotIntervals = configuration['snapshot-intervals'];
  const intervalStr = snapshotIntervals[collName] || snapshotIntervals._default;

  return parseInt(intervalStr, 10);
};