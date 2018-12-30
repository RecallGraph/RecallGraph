'use strict';

const db = require('@arangodb').db;
const { events, commands, snapshots, evtSSLinks } = require('../helpers').SERVICE_COLLECTIONS;

module.exports = function commit(collName, node, op) {
  // noinspection JSUnusedGlobalSymbols
  return db._executeTransaction({
    collections: {
      write: [collName, events, commands, snapshots, evtSSLinks]
    },
    action: (params) => {
      const db = require('@arangodb').db;
      const omit = require('lodash/omit');
      const DB_OPS = require('../helpers').DB_OPS;
      const commitHelpers = require('./helpers');

      const coll = db._collection(params.collName);

      let result, event, timestampType, time, prevEvent;
      switch (params.op) {
        case DB_OPS.INSERT:
          result = coll.insert(params.node, {
            returnNew: true
          });
          time = new Date();
          result.old = {};
          event = 'created';
          timestampType = 'ctime';
          prevEvent = commitHelpers.getTransientOriginFor(coll);

          break;

        case DB_OPS.REPLACE:
          result = coll.replace(params.node._key, params.node, {
            returnNew: true,
            returnOld: true
          });
          time = new Date();
          event = 'updated';
          timestampType = 'mtime';
          prevEvent = commitHelpers.getLatestEvent(result, coll);

          break;

        default:
          throw new Error(`Unknown op: ${op}`);
      }

      const ssData = commitHelpers.getOrCreateLatestSnapshot(params.collName, prevEvent, result.new, time);
      const evtNode = commitHelpers.insertEventNode(omit(result, 'new', 'old'), timestampType, time, event, ssData, prevEvent);

      if (prevEvent['is-origin-node']) {
        commitHelpers.ensureOriginNode(params.collName);
      }
      commitHelpers.insertCommandEdge(prevEvent, evtNode, result.old, result.new);

      if (ssData.ssNode && (ssData.hops === 1)) {
        commitHelpers.insertEvtSSLink(evtNode._id, ssData.ssNode._id);
      }

      return result.new;
    },
    params: {
      collName,
      node,
      op
    }
  });
};