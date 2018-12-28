'use strict';

const helpers = require('../helpers');
const _ = require('lodash');
const jiff = require('jiff');
const db = require('@arangodb').db;
const ARANGO_ERRORS = require('@arangodb').errors;

const SERVICE_COLLECTIONS = helpers.SERVICE_COLLECTIONS;
const commandColl = db._collection(SERVICE_COLLECTIONS.commands);
const snapshotColl = db._collection(SERVICE_COLLECTIONS.snapshots);
const eventColl = db._collection(SERVICE_COLLECTIONS.events);
const snaphotLinkColl = db._collection(SERVICE_COLLECTIONS.snapshotLinks);
const evtSSLinkColl = db._collection(SERVICE_COLLECTIONS.evtSSLinks);

function getOriginFor(coll) {
  return {
    _id: `${SERVICE_COLLECTIONS.events}/origin-${coll._id}`,
    _key: `origin-${coll._id}`,
    'is-origin-node': true,
    'origin-for': coll.name()
  };
}

exports.getPreviousEvent = function getPreviousEvent(node, coll) {
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
    return getOriginFor(coll);
  }
};

exports.getOrCreateLatestSnapshot = function getOrCreateLatestSnapshot(collName, prevEvtNode, node, ctime, mtime) {
  const snapshotInterval = helpers.snapshotInterval(collName);

  let ssNode = null, hops, prevSSid;
  if (snapshotInterval > 0) {
    const prevMeta = prevEvtNode.meta || {};

    if (prevMeta['last-snapshot'] && (prevMeta['hops-from-last-snapshot'] < snapshotInterval)) {
      ssNode = {
        _id: prevMeta['last-snapshot']
      };
      hops = prevMeta['hops-from-last-snapshot'] + 1;
    } else {
      ssNode = {
        meta: { ctime, mtime },
        data: node
      };
      ssNode = snapshotColl.insert(ssNode);
      hops = 1;
      prevSSid = prevMeta['last-snapshot'];
    }
  }

  return { ssNode, hops, prevSSid };
};

exports.insertSnapshotLink = function insertSnapshotLink(fromSSid, toSSid) {
  const ssLink = {
    _from: fromSSid,
    _to: toSSid
  };

  return snaphotLinkColl.insert(ssLink);
};

exports.insertEventNode = function insertEventNode(nodeMeta, timestampType, time, event, ssData, prevEvent) {
  const evtMeta = _.cloneDeep(nodeMeta);

  _.merge(evtMeta, {
    [timestampType]: time,
    event
  });

  if (ssData.ssNode) {
    _.merge(evtMeta, {
      'last-snapshot': ssData.ssNode._id,
      'hops-from-last-snapshot': ssData.hops
    });
  }

  //Insert ctime into event meta if available and not yet inserted
  if ((timestampType === 'mtime') && _.get(prevEvent, 'meta.ctime')) {
    evtMeta.ctime = prevEvent.meta.ctime;
  }

  let evtNode = {
    meta: evtMeta
  };

  return eventColl.insert(evtNode);
};

exports.insertCommandEdge = function insertCommandEdge(prevEvent, evtNode, oldNode, newNode) {
  const cmdEdge = {
    _from: prevEvent._id,
    _to: evtNode._id,
    command: jiff.diff(oldNode, newNode)
  };

  return commandColl.insert(cmdEdge);
};

exports.insertEvtSSLink = function insertEvtSSLink(evtNodeId, ssNodeId) {
  const evtSSLinkEdge = {
    _from: evtNodeId,
    _to: ssNodeId
  };

  return evtSSLinkColl.insert(evtSSLinkEdge);
};

exports.ensureOriginNode = function ensureOriginNode(collName) {
  const coll = db._collection(collName);
  const origin = getOriginFor(coll);

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

exports.getOriginFor = getOriginFor;