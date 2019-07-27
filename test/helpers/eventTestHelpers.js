'use strict'

const {
  random,
  chain,
  pick,
  flatMap,
  findIndex,
  findLastIndex,
  range,
  differenceWith,
  values,
  memoize,
  cloneDeep,
  concat,
  differenceBy,
  sampleSize
} = require('lodash')
const { getSampleDataRefs, TEST_DATA_COLLECTIONS } = require('./init')
const { expect } = require('chai')
const log = require('../../lib/operations/log')
const { getLimitClause, getTimeBoundFilters } = require('../../lib/operations/helpers')
const { aql, db } = require('@arangodb')
const { SERVICE_COLLECTIONS } = require('../../lib/helpers')
const { getSortingClause, getReturnClause, getGroupingClause } = require('../../lib/operations/log/helpers')

function getRandomSubRange (
  objWithLength,
  maxLength = Number.POSITIVE_INFINITY
) {
  if (objWithLength.length > 0) {
    const lower = random(0, objWithLength.length - 1)
    const upperIndexBound =
      (Number.isFinite(maxLength)
        ? Math.min(objWithLength.length, lower + maxLength)
        : objWithLength.length) - 1
    const upper = random(lower, upperIndexBound)

    return [lower, upper]
  }

  return []
}

exports.getRandomSubRange = getRandomSubRange

function getRandomKeyPattern (bracesOnly = false) {
  const patterns = [
    random(9999999),
    random(9999),
    `${random(9)}{${random(9)},${random(9)}}${random(99)}`
  ]

  if (!bracesOnly) {
    patterns[1] = `${patterns[1]}*`
    patterns[2] = `*${patterns[2]}*`
  }

  return patterns.join(',')
}

function getRandomSampleCollectionPatterns (bracesOnly = false) {
  const sampleDataRefsWrapper = chain(getSampleDataRefs())
  const sampleSize = random(1, sampleDataRefsWrapper.size())
  const collsWrapper = sampleDataRefsWrapper
    .pick('vertexCollections', 'edgeCollections')
    .values()
    .flatten()
    .sampleSize(sampleSize)

  if (bracesOnly) {
    return collsWrapper.value()
  } else {
    return collsWrapper
      .map(coll => {
        const range = getRandomSubRange(coll)

        return `*${coll.substring(range[0], range[1])}*`
      })
      .value()
      .join(',')
  }
}

function getTestDataCollectionPatterns () {
  const testDataCollectionPatterns = chain(TEST_DATA_COLLECTIONS)
    .values()
    .map(coll => coll.substring(module.context.collectionPrefix.length))
    .value()
    .join(',')

  return `${module.context.collectionPrefix}{test_does_not_exist,${testDataCollectionPatterns}}`
}

exports.getRandomGraphPathPattern = function getRandomGraphPathPattern () {
  const sampleDataRefs = getSampleDataRefs()
  const graphPatterns = sampleDataRefs.graphs
    .map(graph => {
      const range = getRandomSubRange(graph)

      return `*${graph.substring(range[0], range[1])}*`
    })
    .join(',')

  return `/g/{${graphPatterns},${module.context.collectionPrefix}test_does_not_exist}`
}

exports.getRandomCollectionPathPattern = function getRandomCollectionPathPattern () {
  const sampleCollectionPatterns = getRandomSampleCollectionPatterns()
  const testDataCollectionPatterns = getTestDataCollectionPatterns()

  return `/c/{${sampleCollectionPatterns},${testDataCollectionPatterns}}`
}

exports.getRandomNodeGlobPathPattern = function getRandomNodeGlobPathPattern () {
  const sampleCollectionPatterns = getRandomSampleCollectionPatterns()
  const testDataCollectionPatterns = getTestDataCollectionPatterns()

  return (
    `/ng/{{${sampleCollectionPatterns}}/{${getRandomKeyPattern()}},` +
    `${testDataCollectionPatterns}/{${getRandomKeyPattern()}}}`
  )
}

exports.getRandomNodeBracePathPattern = function getRandomNodeBracePathPattern () {
  const sampleCollectionPatterns = getRandomSampleCollectionPatterns(true)
  const testDataCollectionPatterns = getTestDataCollectionPatterns()

  return (
    `/n/{{${sampleCollectionPatterns}}/{${getRandomKeyPattern(true)}},` +
    `${testDataCollectionPatterns}/{${getRandomKeyPattern(true)}}}`
  )
}

function cartesian (keyedArrays = {}) {
  const keys = Object.keys(keyedArrays)
  if (!keys.length) {
    return []
  }

  const headKey = keys[0]
  if (keys.length === 1) {
    return keyedArrays[headKey].map(val => ({ [headKey]: val }))
  } else {
    const head = keyedArrays[headKey]
    const tail = pick(keyedArrays, keys.slice(1))
    const tailCombos = cartesian(tail)

    return flatMap(tailCombos, tailItem =>
      head.map(headItem => Object.assign({ [headKey]: headItem }, tailItem))
    )
  }
}

exports.cartesian = cartesian

exports.testUngroupedEvents = function testUngroupedEvents (
  pathParam,
  allEvents,
  expectedEvents,
  logFn
) {
  expect(
    allEvents,
    JSON.stringify({
      all: differenceBy(allEvents, expectedEvents, '_id'),
      expected: differenceBy(expectedEvents, allEvents, '_id')
    })
  ).to.deep.equal(expectedEvents)

  if (expectedEvents.length > 0) {
    const timeRange = getRandomSubRange(expectedEvents)
    const sliceRange = getRandomSubRange(range(1, timeRange[1] - timeRange[0]))
    const since = [0, Math.floor(expectedEvents[timeRange[1]].ctime)]
    const until = [0, Math.ceil(expectedEvents[timeRange[0]].ctime)]
    const skip = [0, sliceRange[0]]
    const limit = [0, sliceRange[1]]
    const sortType = [null, 'asc', 'desc']
    const groupBy = [null]
    const countsOnly = [false, true]
    const combos = cartesian({
      since,
      until,
      skip,
      limit,
      sortType,
      groupBy,
      countsOnly
    })

    combos.forEach(combo => {
      const events = logFn(pathParam, combo)

      expect(events).to.be.an.instanceOf(Array)

      const earliestTimeBoundIndex = combo.since
        ? findLastIndex(expectedEvents, e => e.ctime >= combo.since)
        : expectedEvents.length - 1
      const latestTimeBoundIndex =
        combo.until && findIndex(expectedEvents, e => e.ctime <= combo.until)

      const timeSlicedEvents = expectedEvents.slice(
        latestTimeBoundIndex,
        earliestTimeBoundIndex + 1
      )
      const sortedTimeSlicedEvents =
        combo.sortType === 'asc'
          ? timeSlicedEvents.reverse()
          : timeSlicedEvents

      let slicedSortedTimeSlicedEvents
      let start = 0
      let end = 0
      if (combo.limit) {
        start = combo.skip
        end = start + combo.limit
        slicedSortedTimeSlicedEvents = sortedTimeSlicedEvents.slice(start, end)
      } else {
        slicedSortedTimeSlicedEvents = sortedTimeSlicedEvents
      }

      expect(
        events,
        JSON.stringify({
          pathParam,
          combo,
          events: differenceBy(events, slicedSortedTimeSlicedEvents, '_id'),
          expected: differenceBy(slicedSortedTimeSlicedEvents, events, '_id')
        })
      ).to.deep.equal(slicedSortedTimeSlicedEvents)
    })
  }
}

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

function getOriginKeys () {
  const originKeys = differenceWith(
    db._collections(),
    values(SERVICE_COLLECTIONS),
    (coll, svcCollName) => coll.name() === svcCollName
  ).map(coll => `origin-${coll._id}`)
  originKeys.push('origin')

  return originKeys
}

exports.getOriginKeys = getOriginKeys

const queryPartsInializers = {
  database: () => [
    aql`
      for v in ${eventColl}
      filter v._key not in ${getOriginKeys()}
    `
  ],
  graph: () => {
    const sampleDataRefs = getSampleDataRefs()
    const sampleGraphCollNames = concat(
      sampleDataRefs.vertexCollections,
      sampleDataRefs.edgeCollections
    )

    return [
      aql`
        for v in ${eventColl}
        filter v._key not in ${getOriginKeys()}
        filter regex_split(v.meta._id, '/')[0] in ${sampleGraphCollNames}
      `
    ]
  }
}

const initQueryParts = memoize(scope => queryPartsInializers[scope]())

exports.testGroupedEvents = function testGroupedEvents (
  scope,
  pathParam,
  logFn,
  qp = null
) {
  const allEvents = logFn(pathParam) // Ungrouped events in desc order by ctime.

  if (allEvents.length) {
    const timeRange = getRandomSubRange(allEvents)
    const since = [0, Math.floor(allEvents[timeRange[1]].ctime)]
    const until = [0, Math.ceil(allEvents[timeRange[0]].ctime)]
    const skip = [0, 1]
    const limit = [0, 2]
    const sortType = [null, 'asc', 'desc']
    const groupBy = ['node', 'collection', 'event']
    const countsOnly = [false, true]

    const combos = cartesian({
      since,
      until,
      skip,
      limit,
      sortType,
      groupBy,
      countsOnly
    })
    combos.forEach(combo => {
      const eventGroups = logFn(pathParam, combo)

      expect(eventGroups).to.be.an.instanceOf(Array)

      const {
        since: snc,
        until: utl,
        skip: skp,
        limit: lmt,
        sortType: st,
        groupBy: gb,
        countsOnly: co
      } = combo
      const queryParts = cloneDeep(qp || initQueryParts(scope))

      const timeBoundFilters = getTimeBoundFilters(snc, utl)
      timeBoundFilters.forEach(filter => queryParts.push(filter))

      queryParts.push(getGroupingClauseForExpectedResultsQuery(gb, co))
      queryParts.push(getSortingClause(st, gb, co))
      queryParts.push(getLimitClause(lmt, skp))
      queryParts.push(getReturnClause(st, gb, co))

      const query = aql.join(queryParts, '\n')
      const expectedEventGroups = db._query(query).toArray()

      expect(
        eventGroups,
        JSON.stringify({
          combo,
          eventGrps: differenceBy(eventGroups, expectedEventGroups, '_id'),
          expectedGrps: differenceBy(expectedEventGroups, eventGroups, '_id')
        })
      ).to.deep.equal(expectedEventGroups)
    })
  }
}

function getGroupingClauseForExpectedResultsQuery (groupBy, countsOnly) {
  if (groupBy !== 'collection') {
    return getGroupingClause(groupBy, countsOnly)
  } else {
    const groupingPrefix =
      'collect collection = regex_split(v.meta._id, "/")[0]'

    let groupingSuffix
    if (countsOnly) {
      groupingSuffix = 'with count into total'
    } else {
      groupingSuffix = 'into events = keep(v, \'_id\', \'ctime\', \'event\', \'meta\')'
    }

    return aql.literal(`${groupingPrefix} ${groupingSuffix}`)
  }
}

exports.getNodeBraceSampleIds = function getNodeBraceSampleIds (
  maxLength = Number.POSITIVE_INFINITY
) {
  const rootPathEvents = log('/')
  const length = Number.isFinite(maxLength)
    ? Math.min(rootPathEvents.length, maxLength)
    : rootPathEvents.length
  const size = random(1, length)
  const sampleIds = []
  const pathSuffixes = chain(rootPathEvents)
    .shuffle()
    .sampleSize(size)
    .map('meta._id')
    .uniq()
    .map(id => {
      sampleIds.push(id)

      return id.split('/')
    })
    .transform((groups, matchPair) => {
      const group = matchPair[0]
      groups[group] = groups[group] || []
      groups[group].push(matchPair[1])
    }, {})
    .map((keys, collName) => {
      let suffix
      if (keys.length === 1) {
        suffix = keys[0]
      } else {
        suffix = `{${keys.join(',')}}`
      }
      return `${collName}/${suffix}`
    })
    .value()

  const path =
    pathSuffixes.length > 1
      ? `/n/{${pathSuffixes.join(',')}}`
      : `/n/${pathSuffixes[0]}`

  return { path, sampleIds }
}

exports.getSampleTestCollNames = function getSampleTestCollNames () {
  const sampleDataRefs = getSampleDataRefs()
  const testDataCollections = values(TEST_DATA_COLLECTIONS)
  const testCollNames = concat(
    sampleDataRefs.vertexCollections,
    sampleDataRefs.edgeCollections,
    testDataCollections
  )
  const size = random(1, testCollNames.length)

  return sampleSize(testCollNames, size)
}
