'use strict';

const joi = require('joi');
const db = require('@arangodb').db;
const helpers = require('./helpers');

const events = module.context.collectionName('_events');
const commands = module.context.collectionName('_commands');
const snapshots = module.context.collectionName('_snapshots');
const evtSSLink = module.context.collectionName('_evt_ss_link');

module.exports = (router) => {
  router.post('/:collection',
      helpers.verifyCollection,
      ensureOrigin,
      function (req, res) {
        const collName = req.pathParams.collection;
        let node = req.body;
        node = db._executeTransaction({
          collections: {
            write: [collName, events, commands, snapshots, evtSSLink]
          },
          action: (params) => {
            const db = require('@arangodb').db;
            const jiff = require('jiff');
            const _ = require('lodash');

            const coll = db._collection(params.collName);
            const result = coll.insert(node, {
              returnNew: true
            });
            const time = new Date();
            const snapshotInterval = parseInt(params.config['snapshot-interval'], 10);
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
            let evtNode = {
              meta: _.merge(_.omit(result, 'new'), {
                ctime: time
              }, (ssNode ? {
                'last-snapshot': ssNode._id,
                'hops-from-last-snapshot': 0
              } : {}))
            };
            evtNode = eventColl.insert(evtNode);

            const commandColl = db._collection(params.commands);
            const cmdEdge = {
              _from: `${params.events}/origin-${coll._id}`,
              _to: evtNode._id,
              command: jiff.diff({}, result.new)
            }
            commandColl.insert(cmdEdge);

            if (ssNode) {
              const evtSSLinkColl = db._collection(params.evtSSLink);
              const evtSSLinkEdge = {
                _from: evtNode._id,
                _to: ssNode._id
              }
              evtSSLinkColl.insert(evtSSLinkEdge);
            }

            return result.new;
          },
          params: {
            node,
            collName,
            events,
            commands,
            snapshots,
            evtSSLink,
            config: module.context.service.configuration
          }
        });

        res.status(201).json(node);
      })
    .pathParam('collection', joi.string().required(), 'The collection into which to add the node.')
    .body(joi.object().required(), 'The JSON object to persist.')
    .response(201, ['application/json'], 'The create call succeeded.')
    .error(404, 'The collection specified does not exist.')
    .error(500, 'The transaction failed.')
    .summary('Create a node (document or edge).')
    .description('Creates a new document and adds it to the tracking index.');

  console.log('Loaded "create" route');
};

function ensureOrigin(req, res, next) {
  const collName = req.pathParams.collection;
  const coll = db._collection(collName);
  const eventColl = db._collection(events);

  let origin = {
    _key: `origin-${coll._id}`,
    'is-origin-node': true,
    'origin-for': collName
  };
  if (!eventColl.exists(origin)) {
    let err = null;
    try {
      eventColl.insert(origin, {
        waitForSync: true,
        silent: true
      });
    } catch (e) {
      if (e.errorNumber == 1210) {
        console.log(`Origin for ${collName} created elsewhere.`);
      } else {
        err = e;
      }
    } finally {
      next(err);
    }
  } else {
    next();
  }
}