'use strict';

const configuration = module.context.service.configuration;

const SERVICE_COLLECTIONS = {
  events: module.context.collectionName(configuration['event-coll-suffix']),
  commands: module.context.collectionName(configuration['command-coll-suffix']),
  snapshots: module.context.collectionName(configuration['snapshot-coll-suffix']),
  evtSSLinks: module.context.collectionName(configuration['event-snapshot-link-coll-suffix']),
  snapshotLinks: module.context.collectionName(configuration['snapshot-link-coll-suffix'])
};

exports.SERVICE_COLLECTIONS = SERVICE_COLLECTIONS;

exports.DB_OPS = {
  INSERT: 'insert',
  REPLACE: 'replace',
  DELETE: 'delete'
};

exports.snapshotInterval = function snapshotInterval(collName) {
  const snapshotIntervals = configuration['snapshot-intervals'];
  const interval = parseInt(snapshotIntervals[collName]);

  return Number.isInteger(interval) ? interval : parseInt(snapshotIntervals._default);
};

exports.getOriginFor = function getOriginFor(coll) {
  console.dir(Object.keys(coll));
  return {
    _id: `${SERVICE_COLLECTIONS.events}/origin-${coll._id}`,
    _key: `origin-${coll._id}`,
    'is-origin-node': true,
    'origin-for': coll.name()
  };
};