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
const COLL_NAME_REGEX = new RegExp('^' + COLL_NAME_PATTERN + '$');
const DOC_KEY_REGEX = new RegExp('^' + DOC_KEY_PATTERN + '$');
const DOC_ID_REGEX = new RegExp('^' + COLL_NAME_PATTERN + '\\/' + DOC_KEY_PATTERN + '$');

exports.DOC_ID_REGEX = DOC_ID_REGEX;
exports.DOC_KEY_REGEX = DOC_KEY_REGEX;
exports.COLL_NAME_REGEX = COLL_NAME_REGEX;

exports.DB_OPS = Object.freeze({
  INSERT: 'insert',
  REPLACE: 'replace',
  REMOVE: 'remove'
});

exports.snapshotInterval = function snapshotInterval(collName) {
  const snapshotIntervals = configuration['snapshot-intervals'];
  const interval = parseInt(snapshotIntervals[collName]);

  return Number.isInteger(interval) ? interval : parseInt(snapshotIntervals._default);
};

