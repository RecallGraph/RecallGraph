'use strict'

const { db, query } = require('@arangodb')
const minimatch = require('minimatch')
const { random, chain, sampleSize } = require('lodash')
const { getPrefixPattern, getRandomSubRange } = require('../util')
const { getSampleDataRefs, TEST_DATA_COLLECTIONS } = require('../util/init')
const { SERVICE_COLLECTIONS } = require('../../../lib/helpers')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

function getSampleDataCollectionPatterns () {
  const sampleDataRefsWrapper = chain(getSampleDataRefs())
  const sampleSize = random(1, sampleDataRefsWrapper.size())
  const collsWrapper = sampleDataRefsWrapper
    .pick('vertexCollections', 'edgeCollections')
    .values()
    .flatten()
    .sampleSize(sampleSize)

  return collsWrapper.map(coll => {
    const range = getRandomSubRange(coll)

    return `*${coll.substring(range[0], range[1])}*`
  })
    .value()
}

function getTestDataCollectionPatterns () {
  const testDataCollectionPatterns = chain(TEST_DATA_COLLECTIONS)
    .values()
    .map(coll => coll.substring(module.context.collectionPrefix.length))
    .value()
    .join(',')

  return `${module.context.collectionPrefix}{test_does_not_exist,${testDataCollectionPatterns}}`
}

function getRandomNidGroups () {
  return query`
    for e in ${eventColl}
    filter e['hops-from-origin'] == 1
    sort rand()
    limit 100
    
    collect coll = e.collection into keys = e.meta.key
    
    return {coll, keys}
  `.toArray()
}

// Public
function getRandomGraphPathPattern () {
  const sampleDataRefs = getSampleDataRefs()
  const graphPatterns = sampleDataRefs.graphs
    .map(graph => {
      const range = getRandomSubRange(graph)

      return `*${graph.substring(range[0], range[1])}*`
    })
    .join(',')

  return `/g/{${graphPatterns},${module.context.collectionPrefix}test_does_not_exist}`
}

function getRandomCollectionPathPattern (returnPattern = false) {
  const sampleCollectionPattern = getSampleDataCollectionPatterns()
  const testDataCollectionPattern = getTestDataCollectionPatterns()

  const path = `/c/{${sampleCollectionPattern},${testDataCollectionPattern}}`

  if (returnPattern) {
    return {
      path,
      pattern: minimatch.makeRe(path.substring(3)).source
    }
  } else {
    return path
  }
}

function getRandomNodeGlobPathPattern (returnPattern = false) {
  const nidGroups = getRandomNidGroups()
  const patterns = nidGroups.map(group => {
    const ss = random(1, group.keys.length)
    const keys = sampleSize(group.keys, ss)
    const keyPattern = getPrefixPattern(keys)

    return `${group.coll}/${keyPattern}`
  })
  const path = patterns.length > 1 ? `/ng/{${patterns.join(',')}}` : `/ng/${patterns[0]}`

  if (returnPattern) {
    return {
      path,
      pattern: minimatch.makeRe(path.substring(4)).source
    }
  } else {
    return path
  }
}

function getRandomNodeBracePathPattern (returnIds = false) {
  const nidGroups = getRandomNidGroups()
  const patterns = nidGroups.map(group => {
    const ss = random(1, group.keys.length)
    const keys = sampleSize(group.keys, ss)
    const keyPattern = keys.length > 1 ? `{${keys.join(',')}}` : keys[0]

    return `${group.coll}/${keyPattern}`
  })
  const path = patterns.length > 1 ? `/n/{${patterns.join(',')}}` : `/n/${patterns[0]}`

  if (returnIds) {
    const nids = nidGroups.flatMap(group => group.keys.map(key => `${group.coll}/${key}`))

    return { path, nids }
  } else {
    return path
  }
}

module.exports = {
  getRandomGraphPathPattern,
  getRandomCollectionPathPattern,
  getRandomNodeGlobPathPattern,
  getRandomNodeBracePathPattern
}
