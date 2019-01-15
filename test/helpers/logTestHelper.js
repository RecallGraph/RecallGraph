'use strict';

const { random, chain, pick, flatMap } = require('lodash');
const { getSampleDataRefs, TEST_DATA_COLLECTIONS } = require('./init');

function getRandomSubRange(objWithLength) {
  return [random(0, Math.floor(objWithLength.length / 2) - 1),
          random(Math.ceil(objWithLength.length / 2) + 1, objWithLength.length)];
}

exports.getRandomSubRange = getRandomSubRange;

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
  const sampleSize = random(1, sampleDataRefsWrapper.size());
  const collsWrapper = sampleDataRefsWrapper.pick('vertexCollections', 'edgeCollections')
    .values()
    .flatten()
    .sampleSize(sampleSize);

  if (bracesOnly) {
    return collsWrapper.value();
  }
  else {
    return collsWrapper.map(coll => {
        const range = getRandomSubRange(coll);

        return `*${coll.substring(range[0], range[1])}*`;
      })
      .value()
      .join(',');
  }
}

function getTestDataCollectionPatterns() {
  const testDataCollectionPatterns = chain(TEST_DATA_COLLECTIONS).values().map(
    coll => coll.substring(module.context.collectionPrefix.length)).value().join(',');

  return `${module.context.collectionPrefix}{test_does_not_exist,${testDataCollectionPatterns}}`;
}

exports.getRandomGraphPathPattern = function getRandomGraphPathPattern() {
  const sampleDataRefs = getSampleDataRefs();
  const graphPatterns = sampleDataRefs.graphs.map(graph => {
    const range = getRandomSubRange(graph);

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

exports.cartesian = function cartesian(keyedArrays = {}) {
  const keys = Object.keys(keyedArrays);
  if (!keys.length) {
    return [];
  }

  const headKey = keys[0];
  if (keys.length === 1) {
    return keyedArrays[headKey].map(val => ({ [headKey]: val }));
  }
  else {
    const head = keyedArrays[headKey];
    const tail = pick(keyedArrays, keys.slice(1));
    const tailCombos = cartesian(tail);

    return flatMap(tailCombos, (tailItem) => head.map(headItem => Object.assign({ [headKey]: headItem }, tailItem)));
  }
};