'use strict'

const { db } = require('@arangodb')
const { merge, forEach, noop, omit } = require('lodash')
const { SERVICE_COLLECTIONS } = require('../../lib/helpers')
const loadSampleData = require('./loadSampleData')
const cache = require('@arangodb/aql/cache')

cache.properties({ mode: 'on' })

const TEST_DOCUMENT_COLLECTIONS = {
  vertex: module.context.collectionName('test_vertex')
}

const TEST_EDGE_COLLECTIONS = {
  edge: module.context.collectionName('test_edge')
}

const TEST_DATA_COLLECTIONS = Object.freeze(
  merge({}, TEST_DOCUMENT_COLLECTIONS, TEST_EDGE_COLLECTIONS)
)

const TEST_DATA_COLLECTION_SNAPSHPOT_INTERVAL = 2

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

let sampleDataRefs = {}
let testDataCollectionsInitialized = false
let sampleDataLoaded = false
let milestones

exports.setup = function setup ({
  forceTruncateTestData = false,
  forceTruncateService = false,
  ensureSampleDataLoad = false
} = {}) {
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

exports.teardown = noop

exports.TEST_DATA_COLLECTIONS = TEST_DATA_COLLECTIONS
exports.TEST_DATA_COLLECTION_SNAPSHPOT_INTERVAL = TEST_DATA_COLLECTION_SNAPSHPOT_INTERVAL
exports.getSampleDataRefs = () => sampleDataRefs
exports.getMilestones = () => milestones
