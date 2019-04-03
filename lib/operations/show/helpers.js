'use strict';

const { get } = require('lodash');
const { getLatestEvent, getTransientEventOriginFor } = require('../commit/helpers');
const { db, query } = require('@arangodb');
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../../helpers');

const eventColl = db._collection(SERVICE_COLLECTIONS.events);

exports.showByNidAndNRev = function showByNidAndNRev(nid, nrev) {
  let event, result = null;

  if (nrev.startsWith('HEAD')) {
    event = getEventForRelativeNrev(nid, nrev);
  }
  else {
    event = getEventForAbsoluteNrev(nid, nrev);
  }

  if (event['is-origin-node']) {
    result = {};
  }
  else {
    result = showForEvent(event);
  }

  return result;
};

function getEventForAbsoluteNrev(nid, nrev) {
  let event;

  const collName = nid.split('/')[0];
  const coll = db._collection(collName);

  const cursor = query`
      for e in ${eventColl}
        filter e.meta._id == ${nid}
        filter e.meta._rev == ${nrev}
      return e
    `;

  if (cursor.hasNext()) {
    event = cursor.next();
  }
  else {
    event = getTransientEventOriginFor(coll);
  }
  cursor.dispose();

  return event;
}

function getEventForRelativeNrev(nid, nrev) {
  let event;

  const collName = nid.split('/')[0];
  const coll = db._collection(collName);

  const hops = get(nrev.split('~'), '[1]', 0);
  const latestEvent = getLatestEvent({ _id: nid }, coll);

  if ((hops === 0) || latestEvent['is-origin-node']) {
    event = latestEvent;
  }
  else {
    const cursor = query`
        for v in ${hops}
          inbound ${latestEvent._id}
          graph ${SERVICE_GRAPHS.eventLog}
        return v
      `;

    if (cursor.hasNext()) {
      event = cursor.next();
    }
    else {
      event = getTransientEventOriginFor(coll);
    }
    cursor.dispose();
  }

  return event;
}

exports.showByEid = function showByEid(eid) {
  const event = eventColl.document(eid);

  return showForEvent(event);
};

function showForEvent(event) {
  if (event.event === 'deleted') {
    return {};
  }

  const nearestSnapshot = getNearestSnapshot(event);
}

function getNearestSnapshot(event) {
}