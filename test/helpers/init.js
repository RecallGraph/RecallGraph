'use strict';

const db = require('@arangodb').db;
const _ = require('lodash');

const TEST_DOCUMENT_COLLECTIONS = {
  vertex: module.context.collectionName('_test_vertex')
};

const TEST_EDGE_COLLECTIONS = {
  edge: module.context.collectionName('_test_edge')
};

const TEST_DATA_COLLECTIONS = _.merge({}, TEST_DOCUMENT_COLLECTIONS, TEST_EDGE_COLLECTIONS);

exports.setupTestCollections = function setupTestCollections() {
  _.forEach(TEST_DOCUMENT_COLLECTIONS, (collName) => {
    if (!db._collection(collName)) {
      db._createDocumentCollection(collName);
    }
  });

  _.forEach(TEST_EDGE_COLLECTIONS, (collName) => {
    if (!db._collection(collName)) {
      db._createEdgeCollection(collName);
    }
  });

  _.forEach(TEST_DATA_COLLECTIONS, (collName) => module.context.service.configuration['snapshot-intervals'][collName] = 1);
};

exports.teardownTestCollections = function teardownTestCollections() {
  _.forEach(TEST_DATA_COLLECTIONS, (collName) => {
    db._drop(collName);
    delete module.context.service.configuration['snapshot-intervals'][collName];
  });
};

exports.TEST_DATA_COLLECTIONS = TEST_DATA_COLLECTIONS;