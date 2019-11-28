'use strict'

const log = require('../../../lib/operations/log')
const { aql, db } = require('@arangodb')
const {
  random,
  chain,
  pick,
  flatMap,
  differenceWith,
  values,
  memoize,
  concat,
  sampleSize
} = require('lodash')
const { getSampleDataRefs, TEST_DATA_COLLECTIONS } = require('../init')
const { SERVICE_COLLECTIONS } = require('../../../lib/helpers')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

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

function getTestDataCollectionPatterns () {
  const testDataCollectionPatterns = chain(TEST_DATA_COLLECTIONS)
    .values()
    .map(coll => coll.substring(module.context.collectionPrefix.length))
    .value()
    .join(',')

  return `${module.context.collectionPrefix}{test_does_not_exist,${testDataCollectionPatterns}}`
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

exports.getRandomCollectionPathPattern = function getRandomCollectionPathPattern () {
  const sampleCollectionPatterns = getRandomSampleCollectionPatterns()
  const testDataCollectionPatterns = getTestDataCollectionPatterns()

  return `/c/{${sampleCollectionPatterns},${testDataCollectionPatterns}}`
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
exports.initQueryParts = initQueryParts
