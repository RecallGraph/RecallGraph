'use strict';
const db = require('@arangodb').db;
const helpers = require('../lib/helpers');

const {events, commands, snapshots, evtSSLinks, snapshotLinks} = helpers.serviceCollections;
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