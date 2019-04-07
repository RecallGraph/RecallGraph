'use strict';

const manager = require('@arangodb/foxx/manager');
const { get } = require('lodash');
const fs = require('fs');
const Minimatch = require('minimatch').Minimatch;
const isWindows = require('internal').platform.substr(0, 3) === 'win';
const mocha = require('@arangodb/mocha');

const { files, reporter = 'default', grep } = get(module.context.argv, [0], {});

const service = manager.lookupService(module.context.mount);
const testFiles = findTestFiles(service, files);

//Adapted from @arangodb/foxx/mocha.js
const result = mocha.run((file, context) => service.run(file, { context: context }), testFiles, reporter, grep);
if (reporter === 'xunit' && Array.isArray(result) && result[1]) {
  result[1].name = service.mount;
}

module.exports = { result, coverage: __coverage__ };

//Adapted from @arangodb/foxx/mocha.js
function isNotPattern(pattern) {
  return pattern.indexOf('*') === -1;
}

//Adapted from @arangodb/foxx/mocha.js
function findTestFiles(service, files) {
  const patterns = files || service.manifest.tests || [];
  if (patterns.every(isNotPattern)) {
    return patterns.slice();
  }
  const basePath = fs.join(service.root, service.path);
  const paths = fs.listTree(basePath);
  const matchers = patterns.map((pattern) => {
    if (pattern.charAt(0) === '/') {
      pattern = pattern.slice(1);
    }
    else if (pattern.charAt(0) === '.' && pattern.charAt(1) === '/') {
      pattern = pattern.slice(2);
    }
    return new Minimatch(pattern);
  });
  return paths.filter(
    (path) => path && matchers.some((pattern) => pattern.match(
      isWindows ? path.replace(/\\/g, '/') : path
    )) && fs.isFile(fs.join(basePath, path))
  );
}
