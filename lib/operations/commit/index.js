'use strict';

const { db } = require('@arangodb');
const { SERVICE_COLLECTIONS } = require('../../helpers');

const { events, commands, snapshots, evtSSLinks } = SERVICE_COLLECTIONS;

module.exports = function commit(collName, node, op, { returnNew = false, returnOld = false, silent = false } = {},
  options = {}) {
  // noinspection JSUnusedGlobalSymbols
  return db._executeTransaction({
    collections: {
      write: [collName, events, commands, snapshots, evtSSLinks]
    },
    action: (params) => {
      const { has, omit, pickBy } = require('lodash');
      const DB_OPS = require('../../helpers').DB_OPS;
      const {
        prepInsert, prepReplace, prepRemove, prepUpdate, insertEventNode, insertCommandEdge, insertEvtSSLink
      } = require('./helpers');

      const prepOpMap = {
        [DB_OPS.INSERT]: prepInsert,
        [DB_OPS.REPLACE]: prepReplace,
        [DB_OPS.REMOVE]: prepRemove,
        [DB_OPS.UPDATE]: prepUpdate
      };

      if (has(prepOpMap, params.op)) {
        const { result, event, time, prevEvent, ssData } = prepOpMap[params.op](params.collName, params.node,
          params.options);
        const evtNode = insertEventNode(omit(result, 'new', 'old'), time, event, ssData);

        insertCommandEdge(prevEvent, evtNode, result.old, result.new);

        if (ssData.ssNode && (ssData.hopsFromLast === 1)) {
          insertEvtSSLink(evtNode._id, ssData.ssNode._id);
        }

        if (!silent) {
          const keyMap = {
            old: returnOld,
            new: returnNew
          };

          return pickBy(result, (value, key) => has(keyMap, key) ? keyMap[key] : true);
        }
      }
      else {
        throw new Error(`Unknown op: ${op}`);
      }
    },
    params: {
      collName,
      node,
      op,
      options
    }
  });
};