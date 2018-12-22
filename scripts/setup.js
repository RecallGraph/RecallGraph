'use strict';
const db = require('@arangodb').db;
const helpers = require('../lib/routes/document/helpers');

const {events, commands, snapshots, evtSSLinks, snapshotLinks} = helpers.serviceCollections;
const documentCollections = [events, snapshots];
const edgeCollections = [commands, snapshotLinks, evtSSLinks];

for (const localName of documentCollections) {
  const qualifiedName = module.context.collectionName(localName);
  if (!db._collection(qualifiedName)) {
    db._createDocumentCollection(qualifiedName);
  } else if (module.context.isProduction) {
    console.debug(`collection ${qualifiedName} already exists. Leaving it untouched.`)
  }
}

for (const localName of edgeCollections) {
  const qualifiedName = module.context.collectionName(localName);
  if (!db._collection(qualifiedName)) {
    db._createEdgeCollection(qualifiedName);
  } else if (module.context.isProduction) {
    console.debug(`collection ${qualifiedName} already exists. Leaving it untouched.`)
  }
}