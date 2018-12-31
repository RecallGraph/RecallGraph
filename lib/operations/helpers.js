'use strict';

const { SERVICE_COLLECTIONS, snapshotInterval } = require('../helpers');
const { merge, cloneDeep, get } = require('lodash');
const jiff = require('jiff');
const { db } = require('@arangodb');
const { errors: ARANGO_ERRORS } = require('@arangodb');

const commandColl = db._collection(SERVICE_COLLECTIONS.commands);
const snapshotColl = db._collection(SERVICE_COLLECTIONS.snapshots);
const eventColl = db._collection(SERVICE_COLLECTIONS.events);
const evtSSLinkColl = db._collection(SERVICE_COLLECTIONS.evtSSLinks);

function getTransientSnapshotOrigin() {
  return {
    _id: `${SERVICE_COLLECTIONS.snapshots}/origin`,
    _key: 'origin',
    'is-origin-node': true,
    'is-virtual': true,
    data: {}
  }
}

function getTransientEventOriginFor(coll) {
  const key = `origin-${coll._id}`;
  const originSnapshot = getTransientSnapshotOrigin();

  return {
    _id: `${SERVICE_COLLECTIONS.events}/${key}`,
    _key: key,
    'is-origin-node': true,
    'origin-for': coll.name(),
    meta: {
      'last-snapshot': originSnapshot._id,
      'hops-from-last-snapshot': 1,
      'last-snapshot-is-virtual': originSnapshot['is-virtual']
    }
  };
}

function getTransientOrCreateLatestSnapshot(collName, lastEvtNode, node, ctime, mtime) {
  const ssInterval = snapshotInterval(collName);

  let ssNode = null, hopsFromLast, prevSSid, hopsTillNext;
  if (ssInterval > 0) {
    const lastMeta = lastEvtNode.meta || {};

    if (lastMeta['last-snapshot'] && (lastMeta['hops-from-last-snapshot'] < ssInterval)) {
      ssNode = {
        _id: lastMeta['last-snapshot']
      };
      hopsFromLast = lastMeta['hops-from-last-snapshot'] + 1;
    } else {
      ssNode = {
        meta: { ctime, mtime },
        data: node
      };
      ssNode = snapshotColl.insert(ssNode, { returnNew: true }).new;
      hopsFromLast = 1;
      prevSSid = lastMeta['last-snapshot'];
    }

    hopsTillNext = ssInterval + 2 - hopsFromLast;
  }

  return { ssNode, hopsFromLast, hopsTillNext, prevSSid };
}

function getLatestEvent(node, coll) {
  const stmt = db._createStatement(`
            for e in ${SERVICE_COLLECTIONS.events}
            filter e.meta._id == @id
            sort e.meta.mtime desc
            limit 1
            return e
          `);
  stmt.bind('id', node._id);

  const cursor = stmt.execute();
  if (cursor.hasNext()) {
    return cursor.next();
  } else {
    return getTransientEventOriginFor(coll);
  }
}

exports.getTransientEventOriginFor = getTransientEventOriginFor;
exports.getTransientOrCreateLatestSnapshot = getTransientOrCreateLatestSnapshot;
exports.getLatestEvent = getLatestEvent;

exports.insertEventNode = function insertEventNode(nodeMeta, timestampType, time, event, ssData, prevEvent) {
  const evtMeta = cloneDeep(nodeMeta);

  merge(evtMeta, {
    [timestampType]: time,
    event
  });

  if (ssData.ssNode) {
    merge(evtMeta, {
      'last-snapshot': ssData.ssNode._id,
      'hops-from-last-snapshot': ssData.hopsFromLast,
      'hops-till-next-snapshot': ssData.hopsTillNext
    });
  }

  //Insert ctime into event meta if available and not yet inserted
  if ((timestampType !== 'ctime') && get(prevEvent, 'meta.ctime')) {
    evtMeta.ctime = prevEvent.meta.ctime;
  }

  let evtNode = {
    meta: evtMeta
  };

  return eventColl.insert(evtNode, { returnNew: true }).new;
};

exports.insertCommandEdge = function insertCommandEdge(prevEvent, evtNode, oldNode, newNode) {
  const cmdEdge = {
    _from: prevEvent._id,
    _to: evtNode._id,
    command: jiff.diff(oldNode, newNode),
  };
  if (prevEvent['is-origin-node']) {
    cmdEdge.meta = {
      _key: newNode._key
    };
  }

  return commandColl.insert(cmdEdge, { returnNew: true }).new;
};

exports.insertEvtSSLink = function insertEvtSSLink(evtNodeId, ssNodeId) {
  const evtSSLinkEdge = {
    _from: evtNodeId,
    _to: ssNodeId
  };

  return evtSSLinkColl.insert(evtSSLinkEdge, { returnNew: true }).new;
};

exports.ensureOriginNode = function ensureOriginNode(collName) {
  const coll = db._collection(collName);
  const origin = getTransientEventOriginFor(coll);

  if (!eventColl.exists(origin)) {
    try {
      eventColl.insert(origin, {
        waitForSync: true,
        silent: true
      });
    } catch (e) {
      if (e.errorNum !== ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code) {
        throw e;
      }
    }
  }
};

exports.prepInsert = function prepInsert(collName, node) {
  const coll = db._collection(collName);
  const result = coll.insert(node, {
    returnNew: true
  });
  const time = new Date();
  result.old = {};
  const event = 'created';
  const timestampType = 'ctime';
  const prevEvent = getTransientEventOriginFor(coll);
  const ssData = getTransientOrCreateLatestSnapshot(collName, prevEvent, result.new, time);

  return { result, event, timestampType, time, prevEvent, ssData };
};

exports.prepReplace = function prepReplace(collName, node) {
  const coll = db._collection(collName);
  const result = coll.replace(node._key, node, {
    returnNew: true,
    returnOld: true
  });
  const time = new Date();
  const event = 'updated';
  const timestampType = 'mtime';
  const prevEvent = getLatestEvent(result, coll);
  const ssData = getTransientOrCreateLatestSnapshot(collName, prevEvent, result.new, prevEvent.meta.ctime, time);

  return { result, event, timestampType, time, prevEvent, ssData };
};

exports.prepRemove = function prepRemove(collName, node) {
  const coll = db._collection(collName);
  const result = coll.remove(node._key, {
    returnOld: true
  });
  const time = new Date();
  result.new = {};
  const event = 'deleted';
  const timestampType = 'dtime';
  const prevEvent = getLatestEvent(result, coll);
  const ssData = {
    ssNode: {
      _id: prevEvent.meta['last-snapshot']
    },
    hopsFromLast: prevEvent.meta['hops-from-last-snapshot'] + 1
  };

  return { result, event, timestampType, time, prevEvent, ssData };
};