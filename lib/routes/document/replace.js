'use strict';

const joi = require('joi');
const db = require('@arangodb').db;
const helpers = require('./helpers');

const {events, commands, snapshots, evtSSLinks, snapshotLinks} = helpers.serviceCollections;

module.exports = (router) => {
  router.put('/:collection',
      helpers.verifyCollection,
      function (req, res) {
        const collName = req.pathParams.collection;
        let node = req.body;
        node = db._executeTransaction({
          collections: {
            write: [collName, events, commands, snapshots, evtSSLinks, snapshotLinks]
          },
          action: (params) => {
            const db = require('@arangodb').db;
            const jiff = require('jiff');
            const _ = require('lodash');

            const coll = db._collection(params.collName);
            const result = coll.replace(node, {
              returnNew: true,
              returnOld: true
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
              meta: _.merge(_.omit(result, ['new', 'old']), {
                ctime: time,
                event: 'updated'
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
              const evtSSLinkColl = db._collection(params.evtSSLinks);
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
            evtSSLinks,
            snapshotLinks,
            config: module.context.service.configuration
          }
        });

        res.status(201).json(node);
      })
    .pathParam('collection', joi.string().required(), 'The collection into which to replace the document.')
    .body(joi.object().keys({
      _key: joi.string().required()
    }), 'The JSON object to persist.')
    .response(201, ['application/json'], 'The replace call succeeded.')
    .error(404, 'The collection or document specified does not exist.')
    .error(500, 'The transaction failed.')
    .summary('Replace a document (vertex or edge).')
    .description('Replaces document and updates the tracking index.');
};