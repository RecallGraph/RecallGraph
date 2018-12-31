'use strict';

const commit = require('../operations/commit');
const { DB_OPS } = require('../helpers');

function removeSingle({ pathParams, body }, options) {
  return commit(pathParams.collection, body, DB_OPS.REMOVE, options);
}

function removeMultiple({ pathParams, body }, options) {
  const nodes = [];
  body.forEach(node => {
    try {
      nodes.push(removeSingle({ pathParams, body: node }, options));
    } catch (e) {
      nodes.push(e);
    }
  });

  return nodes;
}

module.exports = {
  removeSingle,
  removeMultiple
};