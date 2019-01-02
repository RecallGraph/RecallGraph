'use strict';
const db = require('@arangodb').db;
const helpers = require('../lib/helpers');
const { get } = require('lodash');

const argv = module.context.argv;
if (get(argv, [0, 'confirmTruncate']) !== true) {
  module.exports = 'Please set arg { "confirmTruncate": true } when running this script.';
} else {
  Object.entries(helpers.SERVICE_COLLECTIONS).forEach(entry => {
    const collName = entry[1];
    db._truncate(collName);
    console.log(`Truncated collection: ${collName}`);
  });

  module.exports = helpers.SERVICE_COLLECTIONS;
}
