'use strict';

const commit = require('../operations/commit');
const eventTypes = require('../helpers').EVENT_TYPES;

function createSingle({ pathParams, body }) {
  return commit(pathParams.collection, body, eventTypes.INSERT);
}

function createMultiple({ pathParams, body }) {
  const nodes = [];
  body.forEach(node => {
    try {
      nodes.push(createSingle({ pathParams, body: node }));
    } catch (e) {
      nodes.push(e);
    }
  });

  return nodes;
}

module.exports = {
  createSingle,
  createMultiple
};