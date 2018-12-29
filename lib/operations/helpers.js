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

function getTransientOriginFor(coll) {
  const key = `origin-${coll._id}`;

  return {
    _id: `${SERVICE_COLLECTIONS.events}/${key}`,
    _key: key,
    'is-origin-node': true,
    'origin-for': coll.name()
  };
}

exports.getLatestEvent = function getLatestEvent(node, coll) {
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
    return getTransientOriginFor(coll);
  }
};

exports.getOrCreateLatestSnapshot = function getOrCreateLatestSnapshot(collName, lastEvtNode, node, ctime, mtime) {
  const snapshotInterval = helpers.snapshotInterval(collName);

  let ssNode = null, hops, prevSSid;
  if (snapshotInterval > 0) {
    const lastMeta = lastEvtNode.meta || {};

    if (lastMeta['last-snapshot'] && (lastMeta['hops-from-last-snapshot'] < snapshotInterval)) {
      ssNode = {
        _id: lastMeta['last-snapshot']
      };
      hops = lastMeta['hops-from-last-snapshot'] + 1;
    } else {
      ssNode = {
        meta: { ctime, mtime },
        data: node
      };
      ssNode = snapshotColl.insert(ssNode, { returnNew: true }).new;
      hops = 1;
      prevSSid = lastMeta['last-snapshot'];
    }
  }

  return { ssNode, hops, prevSSid };
};

exports.insertSnapshotLink = function insertSnapshotLink(fromSSid, toSSid) {
  const ssLink = {
    _from: fromSSid,
    _to: toSSid
  };

  return snaphotLinkColl.insert(ssLink, { returnNew: true }).new;
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

  return eventColl.insert(evtNode, { returnNew: true }).new;
};

exports.insertCommandEdge = function insertCommandEdge(prevEvent, evtNode, oldNode, newNode) {
  const cmdEdge = {
    _from: prevEvent._id,
    _to: evtNode._id,
    command: jiff.diff(oldNode, newNode),
    meta: {
      _key: newNode._key
    }
  };

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
  const origin = getTransientOriginFor(coll);

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

exports.getTransientOriginFor = getTransientOriginFor;