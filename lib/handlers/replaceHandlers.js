'use strict';

const commit = require('../operations/commit');
const DB_OPS = require('../helpers').DB_OPS;

function replaceSingle({ pathParams, body }, options) {
  return commit(pathParams.collection, body, DB_OPS.REPLACE, options);
}

function replaceMultiple({ pathParams, body }, options) {
  const nodes = [];
  body.forEach(node => {
    try {
      nodes.push(replaceSingle({ pathParams, body: node }, options));
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