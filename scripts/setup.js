'use strict';
const db = require('@arangodb').db;
const helpers = require('../lib/helpers');

const { events, commands, snapshots, evtSSLinks, snapshotLinks } = helpers.SERVICE_COLLECTIONS;
const documentCollections = [events, snapshots];
const edgeCollections = [commands, snapshotLinks, evtSSLinks];

for (const localName of documentCollections) {
  if (!db._collection(localName)) {
    db._createDocumentCollection(localName);
  } else if (module.context.isProduction) {
    console.debug(`collection ${localName} already exists. Leaving it untouched.`)
  }
}

for (const localName of edgeCollections) {
  if (!db._collection(localName)) {
    db._createEdgeCollection(localName);
  } else if (module.context.isProduction) {
    console.debug(`collection ${localName} already exists. Leaving it untouched.`)
  }
}

const eventColl = db._collection(events);
eventColl.ensureIndex({
  type: 'hash',
  sparse: true,
  unique: false,
  deduplicate: false,
  fields: ['meta._id']
});

const commandColl = db._collection(commands);
commandColl.ensureIndex({
  type: 'hash',
  sparse: false,
  unique: true,
  deduplicate: false,
  fields: ['_from', 'meta._key']
});