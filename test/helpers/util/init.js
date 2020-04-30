'use strict'

const { db } = require('@arangodb')
const cache = require('@arangodb/aql/cache')
const { merge, forEach, omit } = require('lodash')
const { utils: { setTrace, clearTraceContext } } = require('foxx-tracing')
const loadSampleData = require('./loadSampleData')
const { SERVICE_COLLECTIONS } = require('../../../lib/helpers')

cache.properties({ mode: 'on' })

const TEST_DOCUMENT_COLLECTIONS = {
  vertex: module.context.collectionName('test_vertex')
}
const TEST_EDGE_COLLECTIONS = {
  edge: module.context.collectionName('test_edge')
}

let sampleDataRefs = {}
let testDataCollectionsInitialized = false
let sampleDataLoaded = false
let milestones

function ensureTestDocumentCollections () {
  forEach(TEST_DOCUMENT_COLLECTIONS, collName => {
    if (!db._collection(collName)) {
      db._createDocumentCollection(collName)
    }
  })
}

function ensureTestEdgeCollections () {
  forEach(TEST_EDGE_COLLECTIONS, collName => {
    if (!db._collection(collName)) {
      db._createEdgeCollection(collName)
    }
  })
}

function setSnapshotIntervals () {
  forEach(
    TEST_DATA_COLLECTIONS,
    collName => {
      module.context.configuration['snapshot-intervals'][collName] = TEST_DATA_COLLECTION_SNAPSHPOT_INTERVAL
    }
  )
}

function truncateTestDataCollections () {
  forEach(TEST_DATA_COLLECTIONS, collName => {
    db._truncate(collName)
  })

  return true
}

function truncateServiceCollections () {
  forEach(SERVICE_COLLECTIONS, collName => {
    db._truncate(collName)
  })

  return true
}

// Public
const TEST_DATA_COLLECTIONS = Object.freeze(
  merge({}, TEST_DOCUMENT_COLLECTIONS, TEST_EDGE_COLLECTIONS)
)
const TEST_DATA_COLLECTION_SNAPSHPOT_INTERVAL = 2

function setup ({
  forceTruncateTestData = false,
  forceTruncateService = false,
  ensureSampleDataLoad = false
} = {}) {
  setTrace({})

  let testDataCollectionsTruncated = false
  let serviceCollectionsTruncated = false
  let sampleDataLoadMessages = null

  if (!testDataCollectionsInitialized) {
    ensureTestDocumentCollections()
    ensureTestEdgeCollections()
    setSnapshotIntervals()
    testDataCollectionsInitialized = true

    testDataCollectionsTruncated = truncateTestDataCollections()
    serviceCollectionsTruncated = truncateServiceCollections()
  }

  if (forceTruncateTestData && !testDataCollectionsTruncated) {
    testDataCollectionsTruncated = truncateTestDataCollections()
  }

  if (forceTruncateService && !serviceCollectionsTruncated) {
    serviceCollectionsTruncated = truncateServiceCollections()
  }

  if (ensureSampleDataLoad && !sampleDataLoaded) {
    serviceCollectionsTruncated =
      serviceCollectionsTruncated || truncateServiceCollections()

    const results = loadSampleData()
    sampleDataRefs = omit(results, 'messages')
    sampleDataLoadMessages = results.messages
    sampleDataLoaded = true
    milestones = results.milestones
  }

  return {
    serviceCollectionsTruncated,
    testDataCollectionsTruncated,
    sampleDataLoaded,
    sampleDataLoadMessages
  }
}

function teardown () {
  clearTraceContext()
}

function getSampleDataRefs () {
  return sampleDataRefs
}

function getMilestones () {
  return milestones
}

module.exports = {
  TEST_DATA_COLLECTIONS,
  TEST_DATA_COLLECTION_SNAPSHPOT_INTERVAL,
  setup,
  teardown,
  getSampleDataRefs,
  getMilestones
}
