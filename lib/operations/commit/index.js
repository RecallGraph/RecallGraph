'use strict';

const { db } = require('@arangodb');
const { SERVICE_COLLECTIONS } = require('../../helpers');

const { events, commands, snapshots, evtSSLinks } = SERVICE_COLLECTIONS;

module.exports = function commit(collName, node, op, { returnNew = false, returnOld = false, silent = false } = {}) {
  // noinspection JSUnusedGlobalSymbols
  return db._executeTransaction({
    collections: {
      write: [collName, events, commands, snapshots, evtSSLinks]
    },
    action: (params) => {
      const _ = require('lodash');
      const DB_OPS = require('../../helpers').DB_OPS;
      const commitHelpers = require('./helpers');

      const prepOpMap = {
        [DB_OPS.INSERT]: commitHelpers.prepInsert,
        [DB_OPS.REPLACE]: commitHelpers.prepReplace,
        [DB_OPS.REMOVE]: commitHelpers.prepRemove
      };

      if (_.has(prepOpMap, params.op)) {
        const { result, event, timestampType, time, prevEvent, ssData } = prepOpMap[params.op](params.collName, params.node);
        const evtNode = commitHelpers.insertEventNode(_.omit(result, 'new', 'old'), timestampType, time, event, ssData, prevEvent);

        if (prevEvent['is-origin-node']) {
          commitHelpers.ensureOriginNode(params.collName);
        }
        commitHelpers.insertCommandEdge(prevEvent, evtNode, result.old, result.new);

        if (ssData.ssNode && (ssData.hopsFromLast === 1)) {
          commitHelpers.insertEvtSSLink(evtNode._id, ssData.ssNode._id);
        }

        if (!silent) {
          const keyMap = {
            old: returnOld,
            new: returnNew
          };

          return _.pickBy(result, (value, key) => _.has(keyMap, key) ? keyMap[key] : true);
        }
      } else {
        throw new Error(`Unknown op: ${op}`);
      }
    },
    params: {
      collName,
      node,
      op
    }
  });
};