'use strict';
const db = require('@arangodb').db;
const collections = require('../collections.json');

const {
  'event-coll-suffix': events,
  'snapshot-coll-suffix': snapshots,
  'command-coll-suffix': commands,
  'snapshot-link-coll-suffix': snapshotLinks,
  'event-snapshot-link-coll-suffix': evtSSLinks
} = collections;

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