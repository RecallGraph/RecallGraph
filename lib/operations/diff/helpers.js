'use strict';

const { SERVICE_COLLECTIONS } = require('../../helpers');
const { db } = require('@arangodb');

const eventColl = db._collection(SERVICE_COLLECTIONS.events);

exports.isPersistedEvent = function isPersistedEvent(obj, allowOrigins = false, allowSuperNode = false) {
  try {
    const event = eventColl.document(obj);

    return (allowSuperNode || !event['is-super-origin-node']) && (allowOrigins || !event['is-origin-node']);
  }
  catch (e) {
    return false;
  }
};

exports.isSameTrack = function isSameTrack(fromEvent, toEvent) {
  return fromEvent.meta._id === toEvent.meta._id;
};