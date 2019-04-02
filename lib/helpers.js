'use strict';

const configuration = module.context.service.configuration;
const SERVICE_COLLECTIONS = Object.freeze({
  events: module.context.collectionName(configuration['event-coll-suffix']),
  commands: module.context.collectionName(configuration['command-coll-suffix']),
  snapshots: module.context.collectionName(configuration['snapshot-coll-suffix']),
  evtSSLinks: module.context.collectionName(configuration['event-snapshot-link-coll-suffix'])
});
exports.SERVICE_COLLECTIONS = SERVICE_COLLECTIONS;

const DOC_KEY_PATTERN = "[a-zA-Z0-9-_:.@()+,=;$!*'%]+";
const COLL_NAME_PATTERN = "[a-zA-Z0-9-_]+";
exports.COLL_NAME_REGEX = new RegExp('^' + COLL_NAME_PATTERN + '$');
exports.DOC_KEY_REGEX = new RegExp('^' + DOC_KEY_PATTERN + '$');
exports.DOC_ID_REGEX = new RegExp('^' + COLL_NAME_PATTERN + '\\/' + DOC_KEY_PATTERN + '$');

exports.SERVICE_GRAPHS = Object.freeze({
  eventLog: `${module.context.collectionPrefix}event_log`
});

exports.DB_OPS = Object.freeze({
  INSERT: 'insert',
  REPLACE: 'replace',
  REMOVE: 'remove',
  UPDATE: 'update'
});

exports.PATCH_TYPES = Object.freeze({
  NONE: 'none',
  FORWARD: 'forward',
  REVERSE: 'reverse'
});

exports.snapshotInterval = function snapshotInterval(collName) {
  const snapshotIntervals = configuration['snapshot-intervals'];
  const interval = parseInt(snapshotIntervals[collName]);

  return Number.isInteger(interval) ? interval : parseInt(snapshotIntervals._default);
};

const TRANSIENT_EVENT_SUPERNODE = {
  _id: `${SERVICE_COLLECTIONS.events}/origin`,
  _key: 'origin',
  'is-super-origin-node': true
};
exports.TRANSIENT_EVENT_SUPERNODE = TRANSIENT_EVENT_SUPERNODE;
