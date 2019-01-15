'use strict';
const { db, errors: ARANGO_ERRORS } = require('@arangodb');
const gg = require('@arangodb/general-graph');
const { SERVICE_COLLECTIONS, SERVICE_GRAPHS } = require('../lib/helpers');

const { events, commands, snapshots, evtSSLinks } = SERVICE_COLLECTIONS;
const documentCollections = [events, snapshots];
const edgeCollections = [commands, evtSSLinks];

for (const localName of documentCollections) {
  if (!db._collection(localName)) {
    db._createDocumentCollection(localName);
  }
  else if (module.context.isProduction) {
    console.debug(`collection ${localName} already exists. Leaving it untouched.`);
  }
}

for (const localName of edgeCollections) {
  if (!db._collection(localName)) {
    db._createEdgeCollection(localName);
  }
  else if (module.context.isProduction) {
    console.debug(`collection ${localName} already exists. Leaving it untouched.`);
  }
}

const eventColl = db._collection(events);
eventColl.ensureIndex({
  type: 'hash',
  sparse: true,
  unique: false,
  deduplicate: false,
  fields: ['meta._id', 'event', 'ctime']
});
eventColl.ensureIndex({
  type: 'skiplist',
  sparse: true,
  unique: false,
  deduplicate: false,
  fields: ['ctime']
});

const commandColl = db._collection(commands);
commandColl.ensureIndex({
  type: 'hash',
  sparse: true,
  unique: true,
  deduplicate: false,
  fields: ['_from', 'meta._id']
});

const { eventLog } = SERVICE_GRAPHS;
let edgeDefs;
try {
  const commandRel = gg._relation(commands, [events], [events]);
  const ssRel = gg._relation(evtSSLinks, [events], [snapshots]);
  edgeDefs = gg._edgeDefinitions(commandRel, ssRel);

  gg._drop(eventLog);
}
catch (e) {
  if (e.errorNum !== ARANGO_ERRORS.ERROR_GRAPH_NOT_FOUND.code) {
    console.error(e);
  }
}
finally {
  gg._create(eventLog, edgeDefs);
}
