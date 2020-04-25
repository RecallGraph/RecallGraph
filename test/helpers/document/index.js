'use strict'

const { random, chain, sampleSize, union } = require('lodash')
const { db, query } = require('@arangodb')
const { getPrefixPattern, getRandomSubRange } = require('../util')
const { getSampleDataRefs, TEST_DATA_COLLECTIONS } = require('../util/init')
const { SERVICE_COLLECTIONS } = require('../../../lib/helpers')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

function getSampleDataCollectionPatterns (bracesOnly) {
  const sampleDataRefsWrapper = chain(getSampleDataRefs())
  const sampleSize = random(1, sampleDataRefsWrapper.size())
  const collsWrapper = sampleDataRefsWrapper
    .pick('vertexCollections', 'edgeCollections')
    .values()
    .flatten()
    .sampleSize(sampleSize)
  const collNames = []
  let pathPattern

  if (bracesOnly) {
    pathPattern = collsWrapper.value()
  } else {
    pathPattern = collsWrapper.map(coll => {
      collNames.push(coll)
      const range = getRandomSubRange(coll)

      return `*${coll.substring(range[0], range[1])}*`
    })
      .value()
  }

  return { pathPattern, collNames }
}

function getTestDataCollectionPatterns () {
  const testDataCollectionPatterns = chain(TEST_DATA_COLLECTIONS)
    .values()
    .map(coll => coll.substring(module.context.collectionPrefix.length))
    .value()
    .join(',')

  return {
    pathPattern: `${module.context.collectionPrefix}{test_does_not_exist,${testDataCollectionPatterns}}`,
    collNames: Object.values(TEST_DATA_COLLECTIONS).concat([`${module.context.collectionPrefix}test_does_not_exist`])
  }
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

function getRandomCollectionPathPattern (returnCollNames = false, bracesOnly = false) {
  const { pathPattern: sampleCollectionPattern, collNames: scn } = getSampleDataCollectionPatterns(bracesOnly)
  const { pathPattern: testDataCollectionPattern, collNames: tcn } = getTestDataCollectionPatterns()

  const path = `/c/{${sampleCollectionPattern},${testDataCollectionPattern}}`

  if (returnCollNames) {
    return {
      path,
      collNames: union(scn, tcn)
    }
  } else {
    return path
  }
}

function getRandomNodeGlobPathPattern (returnCollNames = false) {
  const nidGroups = getRandomNidGroups()
  const patterns = nidGroups.map(group => {
    const ss = random(1, group.keys.length)
    const keys = sampleSize(group.keys, ss)
    const keyPattern = getPrefixPattern(keys)

    return `${group.coll}/${keyPattern}`
  })
  const path = patterns.length > 1 ? `/ng/{${patterns.join(',')}}` : `/ng/${patterns[0]}`

  if (returnCollNames) {
    const collNames = nidGroups.map(group => group.coll)

    return { path, collNames }
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
