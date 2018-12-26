'use strict';

const db = require('@arangodb').db;
const helpers = require('../helpers');

const { events, commands, snapshots, evtSSLinks, snapshotLinks } = helpers.SERVICE_COLLECTIONS;

module.exports = function commit(collName, node, op) {
  return db._executeTransaction({
    collections: {
      write: [collName, events, commands, snapshots, evtSSLinks]
    },
    action: (params) => {
      const db = require('@arangodb').db;
      const jiff = require('jiff');
      const _ = require('lodash');
      const eventTypes = require('../helpers').EVENT_TYPES;

      const coll = db._collection(params.collName);
      let result, event, timestampType;
      switch (op) {
        case eventTypes.INSERT:
          result = coll.insert(node, {
            returnNew: true
          });
          result.old = {};
          event = 'created';
          timestampType = 'ctime';

          break;

        default:
          throw new Error(`Unknown op: ${op}`);
      }
      const time = new Date();
      const snapshotInterval = helpers.snapshotInterval(params.collName);
      let ssNode = null;

      if (snapshotInterval > 0) {
        const snapshotColl = db._collection(params.snapshots);
        ssNode = {
          meta: {
            ctime: time
          },
          data: result.new
        };
        ssNode = snapshotColl.insert(ssNode);
      }

      const eventColl = db._collection(params.events);
      const evtMeta = _.merge(_.omit(result, 'new', 'old'),
        {
          [timestampType]: time,
          event: event
        },
        (ssNode ? {
          'last-snapshot': ssNode._id,
          'hops-from-last-snapshot': 0
        } : {}));
      let evtNode = {
        meta: evtMeta
      };
      evtNode = eventColl.insert(evtNode);

      const commandColl = db._collection(params.commands);
      const cmdEdge = {
        _from: `${params.events}/origin-${coll._id}`,
        _to: evtNode._id,
        command: jiff.diff(result.old, result.new)
      };
      commandColl.insert(cmdEdge);

      if (ssNode) {
        const evtSSLinkColl = db._collection(params.evtSSLinks);
        const evtSSLinkEdge = {
          _from: evtNode._id,
          _to: ssNode._id
        };
        evtSSLinkColl.insert(evtSSLinkEdge);
      }

      return result.new;
    },
    params: {
      collName,
      node,
      op,
      events,
      commands,
      snapshots,
      evtSSLinks,
      snapshotLinks
    }
  });
};