'use strict';

const { db } = require('@arangodb');
const { merge, forEach } = require('lodash');
const { SERVICE_COLLECTIONS } = require('../../lib/helpers');

const TEST_DOCUMENT_COLLECTIONS = {
  vertex: module.context.collectionName('test_vertex')
};

const TEST_EDGE_COLLECTIONS = {
  edge: module.context.collectionName('test_edge')
};

const TEST_DATA_COLLECTIONS = merge({}, TEST_DOCUMENT_COLLECTIONS, TEST_EDGE_COLLECTIONS);

const COLLECTION_SNAPSHPOT_INTERVAL = 2;

exports.setup = function setup() {
  forEach(TEST_DOCUMENT_COLLECTIONS, (collName) => {
    if (!db._collection(collName)) {
      db._createDocumentCollection(collName);
    }
  });

  forEach(TEST_EDGE_COLLECTIONS, (collName) => {
    if (!db._collection(collName)) {
      db._createEdgeCollection(collName);
    }
  });

  forEach(TEST_DATA_COLLECTIONS, (collName) => module.context.service.configuration['snapshot-intervals'][collName] = COLLECTION_SNAPSHPOT_INTERVAL);
};

exports.teardown = function teardown() {
  const COLLECTIONS = merge({}, TEST_DATA_COLLECTIONS, SERVICE_COLLECTIONS);
  forEach(COLLECTIONS, (collName) => {
    db._truncate(collName);
  });
};

exports.TEST_DATA_COLLECTIONS = TEST_DATA_COLLECTIONS;
exports.COLLECTION_SNAPSHPOT_INTERVAL = COLLECTION_SNAPSHPOT_INTERVAL;