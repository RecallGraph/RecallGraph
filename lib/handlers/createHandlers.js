"use strict";

const commit = require("../operations/commit");
const { DB_OPS } = require("../helpers");

function createSingle({ pathParams, body }, options) {
  return commit(pathParams.collection, body, DB_OPS.INSERT, options);
}

function createMultiple({ pathParams, body }, options) {
  const nodes = [];
  body.forEach(node => {
    try {
      nodes.push(createSingle({ pathParams, body: node }, options));
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
