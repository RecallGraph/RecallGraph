'use strict';

const commit = require('../operations/commit');
const DB_OPS = require('../helpers').DB_OPS;

function replaceSingle({ pathParams, body }) {
  return commit(pathParams.collection, body, DB_OPS.REPLACE);
}

function replaceMultiple({ pathParams, body }) {
  const nodes = [];
  body.forEach(node => {
    try {
      nodes.push(replaceSingle({ pathParams, body: node }));
    } catch (e) {
      nodes.push(e);
    }
  });

  return nodes;
}

module.exports = {
  replaceSingle,
  replaceMultiple
};