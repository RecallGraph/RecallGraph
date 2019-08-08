'use strict'

// noinspection NpmUsedModulesInstalled
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
  sampleSize,
  omit,
  partialRight
} = require('lodash')
const { getSampleDataRefs, TEST_DATA_COLLECTIONS } = require('./init')
// noinspection NpmUsedModulesInstalled
const { expect } = require('chai')
const log = require('../../lib/operations/log')
const { getLimitClause, getTimeBoundFilters } = require('../../lib/operations/helpers')
// noinspection NpmUsedModulesInstalled
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
    // noinspection JSUnresolvedFunction
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
  // noinspection JSUnresolvedVariable
  const testDataCollectionPatterns = chain(TEST_DATA_COLLECTIONS)
    .values()
    .map(coll => coll.substring(module.context.collectionPrefix.length))
    .value()
    .join(',')

  // noinspection JSUnresolvedVariable
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

  // noinspection JSUnresolvedVariable
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
  const expectedEventsSansCommands = expectedEvents.map(partialRight(omit, 'command'))
  expect(allEvents).to.deep.equal(expectedEventsSansCommands)

  if (expectedEvents.length > 0) {
    const timeRange = getRandomSubRange(expectedEvents)
    const sliceRange = getRandomSubRange(range(1, timeRange[1] - timeRange[0]))
    const since = [0, Math.floor(expectedEvents[timeRange[1]].ctime)]
    const until = [0, Math.ceil(expectedEvents[timeRange[0]].ctime)]
    const skip = [0, sliceRange[0]]
    const limit = [0, sliceRange[1]]
    const sort = [null, 'asc', 'desc']
    const groupBy = [null]
    const countsOnly = [false, true]
    const groupSort = [null, 'asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 2]
    const returnCommands = [false, true]
    const combos = cartesian({
      since,
      until,
      skip,
      limit,
      sort,
      groupBy,
      countsOnly,
      groupSort,
      groupSkip,
      groupLimit,
      returnCommands
    })

    combos.forEach(combo => {
      const events = logFn(pathParam, combo)

      expect(events).to.be.an.instanceOf(Array)

      const relevantExpectedEvents = combo.returnCommands ? expectedEvents : expectedEventsSansCommands

      const earliestTimeBoundIndex = combo.since
        ? findLastIndex(relevantExpectedEvents, e => e.ctime >= combo.since)
        : relevantExpectedEvents.length - 1
      const latestTimeBoundIndex =
        combo.until && findIndex(relevantExpectedEvents, e => e.ctime <= combo.until)

      const timeSlicedEvents = relevantExpectedEvents.slice(
        latestTimeBoundIndex,
        earliestTimeBoundIndex + 1
      )
      const sortedTimeSlicedEvents =
        combo.sort === 'asc'
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

      expect(events.length).to.equal(slicedSortedTimeSlicedEvents.length)
      expect(events[0]).to.deep.equal(slicedSortedTimeSlicedEvents[0])
      events.forEach((event, idx) => {
        expect(event).to.be.an.instanceOf(Object)
        expect(event).to.have.property('_id')
        expect(event._id).to.equal(slicedSortedTimeSlicedEvents[idx]._id)
      })
    })
  }
}

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

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
      for e in ${commandColl}
      filter e._to == v._id
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
        for e in ${commandColl}
        filter e._to == v._id
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
    const sort = [null, 'asc', 'desc']
    const skip = [0, 1]
    const limit = [0, 2]
    const groupBy = ['node', 'collection', 'event']
    const countsOnly = [false, true]
    const groupSort = [null, 'asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 2]
    const returnCommands = [false, true]

    const combos = cartesian({
      since,
      until,
      skip,
      limit,
      sort,
      groupBy,
      countsOnly,
      groupSort,
      groupSkip,
      groupLimit,
      returnCommands
    })
    combos.forEach(combo => {
      const eventGroups = logFn(pathParam, combo)

      expect(eventGroups).to.be.an.instanceOf(Array)

      const {
        since: snc,
        until: utl,
        skip: skp,
        limit: lmt,
        sort: st,
        groupBy: gb,
        countsOnly: co,
        groupSort: gst,
        groupSkip: gskp,
        groupLimit: glmt,
        returnCommands: rc
      } = combo
      const queryParts = cloneDeep(qp || initQueryParts(scope))

      const timeBoundFilters = getTimeBoundFilters(snc, utl)
      timeBoundFilters.forEach(filter => queryParts.push(filter))

      queryParts.push(getGroupingClauseForExpectedResultsQuery(gb, co, rc))
      queryParts.push(getSortingClause(st, gb, co))
      queryParts.push(getLimitClause(lmt, skp))
      queryParts.push(getReturnClause(gb, co, gst, gskp, glmt, rc))

      const query = aql.join(queryParts, '\n')
      const expectedEventGroups = db._query(query).toArray()

      expect(eventGroups).to.deep.equal(expectedEventGroups)
      expect(eventGroups.length).to.equal(expectedEventGroups.length)
      expect(eventGroups[0]).to.deep.equal(expectedEventGroups[0])
      eventGroups.forEach((eventGroup, idx1) => {
        expect(eventGroup).to.be.an.instanceOf(Object)
        expect(eventGroup).to.have.property('node')
        expect(eventGroup.node).to.equal(expectedEventGroups[idx1].node)
        expect(eventGroup).to.have.property('events')
        expect(eventGroup.events).to.be.an.instanceOf(Array)
        eventGroup.events.forEach((event, idx2) => {
          expect(event).to.be.an.instanceOf(Object)
          expect(event).to.have.property('_id')
          expect(event._id).to.equal(expectedEventGroups[idx1].events[idx2]._id)
        })
      })
    })
  }
}

function getGroupingClauseForExpectedResultsQuery (groupBy, countsOnly, returnCommands) {
  if (groupBy !== 'collection') {
    return getGroupingClause(groupBy, countsOnly, returnCommands)
  } else {
    const groupingPrefix =
      'collect collection = regex_split(v.meta._id, "/")[0]'

    let groupingSuffix
    if (countsOnly) {
      groupingSuffix = 'with count into total'
    } else if (returnCommands) {
      groupingSuffix = 'into events = merge(keep(v, "_id", "ctime", "event", "meta"), {command: e.command})'
    } else {
      groupingSuffix = 'into events = keep(v, "_id", "ctime", "event", "meta")'
    }

    return aql.literal(`${groupingPrefix} ${groupingSuffix}`)
  }
}

exports.getNodeBraceSampleIds = function getNodeBraceSampleIds (
  maxLength = Number.POSITIVE_INFINITY
) {
  const rootPathEvents = log('/')
  // noinspection JSUnresolvedVariable
  const length = Number.isFinite(maxLength)
    ? Math.min(rootPathEvents.length, maxLength)
    : rootPathEvents.length
  const size = random(1, length)
  const sampleIds = []
  // noinspection JSCheckFunctionSignatures
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
