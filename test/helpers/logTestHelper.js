'use strict';

const { random, chain, pick, flatMap, findIndex, findLastIndex, range } = require('lodash');
const { getSampleDataRefs, TEST_DATA_COLLECTIONS } = require('./init');
const { expect } = require('chai');
const log = require('../../lib/operations/log');
const { getGroupingClause } = require('../../lib/operations/log/helpers');
const { aql } = require('@arangodb');

function getRandomSubRange(objWithLength) {
  return [random(0, Math.floor(objWithLength.length / 2) - 1),
          random(Math.ceil(objWithLength.length / 2) + 1, objWithLength.length - 1)];
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

function cartesian(keyedArrays = {}) {
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
}

exports.cartesian = cartesian;

exports.testUngroupedEvents = function testUngroupedEvents(path, allEvents, expectedEvents) {
  expect(allEvents).to.deep.equal(expectedEvents);

  const timeRange = getRandomSubRange(allEvents),
    sliceRange = getRandomSubRange(range(1, timeRange[1] - timeRange[0]));
  const since = [0, allEvents[timeRange[1]].ctime], until = [0, allEvents[timeRange[0]].ctime];
  const skip = [0, sliceRange[0]], limit = [0, sliceRange[1]];
  const sortType = [null, 'asc', 'desc'], groupBy = [null], countsOnly = [false, true];
  const combos = cartesian({ since, until, skip, limit, sortType, groupBy, countsOnly });

  combos.forEach(combo => {
    const events = log(path, combo);

    expect(events).to.be.an.instanceOf(Array);

    const earliestTimeBoundIndex = combo.since ? findLastIndex(allEvents,
      { ctime: combo.since }) : allEvents.length - 1;
    const latestTimeBoundIndex = combo.until && findIndex(allEvents, { ctime: combo.until });

    const timeSlicedEvents = allEvents.slice(latestTimeBoundIndex, earliestTimeBoundIndex + 1);
    const sortedTimeSlicedEvents = (combo.sortType === 'asc') ? timeSlicedEvents.reverse() : timeSlicedEvents;

    //https://wiki.teamfortress.com/wiki/Horseless_Headless_Horsemann
    let slicedSortedTimeSlicedEvents, start = 0, end = 0;
    if (combo.limit) {
      start = combo.skip;
      end = start + combo.limit;
      slicedSortedTimeSlicedEvents = sortedTimeSlicedEvents.slice(start, end);
    }
    else {
      slicedSortedTimeSlicedEvents = sortedTimeSlicedEvents;
    }

    expect(events).to.deep.equal(slicedSortedTimeSlicedEvents);
  });
};

exports.getGroupingClauseForExpectedResultsQuery = function getGroupingClauseForExpectedResultsQuery(groupBy,
  countsOnly) {
  if (groupBy !== 'collection') {
    return getGroupingClause(groupBy, countsOnly);
  }
  else {
    const groupingPrefix = 'collect collection = regex_split(v.meta._id, "/")[0]';

    let groupingSuffix;
    if (countsOnly) {
      groupingSuffix = 'with count into total';
    }
    else {
      groupingSuffix = 'into events = keep(v, \'_id\', \'ctime\', \'event\', \'meta\')';
    }

    return aql.literal(`${groupingPrefix} ${groupingSuffix}`);
  }
};