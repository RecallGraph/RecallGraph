'use strict';

const { random, chain } = require('lodash');
const { getSampleDataRefs, TEST_DATA_COLLECTIONS } = require('./init');

function getRandomSubstringRange(str) {
  return [random(0, Math.floor(str.length / 2) - 1), random(Math.ceil(str.length / 2) + 1, str.length)];
}

function getRandomKeyPattern(bracesOnly = false) {
  const patterns = [
    random(9999999),
    random(9999),
    `${random(9)}{${random(9)},${random(9)}}${random(99)}`
  ];

  if (!bracesOnly) {
    patterns[1] = `${patterns[1]}*`;
    patterns[2] = `*${patterns[2]}*`;
  }

  return patterns.join(',');
}

function getRandomSampleCollectionPatterns(bracesOnly = false) {
  const sampleDataRefsWrapper = chain(getSampleDataRefs());

  return sampleDataRefsWrapper.pick('vertexCollections', 'edgeCollections')
    .values()
    .flatten()
    .map(coll => {
      const range = getRandomSubstringRange(coll);
      const substr = coll.substring(range[0], range[1]);

      if (bracesOnly) {
        return substr;
      }
      else {
        return `*${substr}*`;
      }
    })
    .value()
    .join(',');
}

function getTestDataCollectionPatterns() {
  const testDataCollectionPatterns = chain(TEST_DATA_COLLECTIONS).values().map(
    coll => coll.substring(module.context.collectionPrefix.length)).value().join(',');

  return `${module.context.collectionPrefix}{test_does_not_exist,${testDataCollectionPatterns}}`;
}

exports.getRandomGraphPathPattern = function getRandomGraphPathPattern() {
  const sampleDataRefs = getSampleDataRefs();
  const graphPatterns = sampleDataRefs.graphs.map(graph => {
    const range = getRandomSubstringRange(graph);

    return `*${graph.substring(range[0], range[1])}*`;
  }).join(',');

  return `/g/{${graphPatterns},${module.context.collectionPrefix}test_does_not_exist}`;
};

exports.getRandomCollectionPathPattern = function getRandomCollectionPathPattern() {
  const sampleCollectionPatterns = getRandomSampleCollectionPatterns();
  const testDataCollectionPatterns = getTestDataCollectionPatterns();

  return `/c/{${sampleCollectionPatterns},${testDataCollectionPatterns}}`;
};

exports.getRandomNodeGlobPathPattern = function getRandomNodeGlobPathPattern() {
  const sampleCollectionPatterns = getRandomSampleCollectionPatterns();
  const testDataCollectionPatterns = getTestDataCollectionPatterns();

  return `/ng/{{${sampleCollectionPatterns}}/{${getRandomKeyPattern()}},`
    + `${testDataCollectionPatterns}/{${getRandomKeyPattern()}}}`;
};

exports.getRandomNodeBracePathPattern = function getRandomNodeBracePathPattern() {
  const sampleCollectionPatterns = getRandomSampleCollectionPatterns(true);
  const testDataCollectionPatterns = getTestDataCollectionPatterns();

  return `/n/{{${sampleCollectionPatterns}}/{${getRandomKeyPattern(true)}},`
    + `${testDataCollectionPatterns}/{${getRandomKeyPattern(true)}}}`;
};