'use strict';
const mocha = require('@arangodb/foxx/mocha');
const manager = require('@arangodb/foxx/manager');
const { get, clone } = require('lodash');

const manifestTests = clone(module.context.manifest.tests);

const argv = module.context.argv;
const tests = get(argv, [0, 'tests']);
const reporter = get(argv, [0, 'reporter'], 'default');

const service = manager.lookupService(module.context.mount);
if (tests) {
  service.manifest.tests = tests;
}

let results;
try {
  results = mocha.run(service, reporter);
}
catch (e) {
  results = e.message;
}

module.exports = results;

service.manifest.tests = manifestTests;
