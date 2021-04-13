'use strict'

const { db } = require('@arangodb')
const cache = require('@arangodb/aql/cache')
const { forEach, omit, isPlainObject, get } = require('lodash')
const { utils: { setTrace, clearTraceContext } } = require('@recallgraph/foxx-tracer')
const loadSampleData = require('./loadSampleData')
const loadFlightData = require('./loadFlightData')
const { SERVICE_COLLECTIONS } = require('../../../lib/constants')

cache.properties({ mode: 'on' })

const TEST_DATA_COLLECTIONS = {}
const TEST_DOCUMENT_COLLECTIONS = {
  rawData: {
    name: 'raw_data',
    indexes: [
      {
        type: 'fulltext',
        fields: ['Type']
      }
    ]
  },
  stars: 'stars',
  planets: 'planets',
  moons: 'moons',
  asteroids: 'asteroids',
  comets: 'comets',
  dwarfPlanets: 'dwarf_planets',
  vertex: 'vertex',
  airports: 'airports'
}
const TEST_EDGE_COLLECTIONS = {
  lineage: 'lineage',
  edge: 'edge',
  flights: 'flights'
}

let collectionsInitialized = false
let sampleDataRefs = {}
let sampleDataLoaded = false
let flightDataRefs = {}
let flightDataLoaded = false

function ensureTestDocumentCollections (truncate = true) {
  ensureCollections(TEST_DOCUMENT_COLLECTIONS, db._createDocumentCollection, truncate)
}

function ensureTestEdgeCollections (truncate = true) {
  ensureCollections(TEST_EDGE_COLLECTIONS, db._createEdgeCollection, truncate)
}

function ensureCollections (collections, collFn, truncate) {
  forEach(collections, (collInfo, key) => {
    const collIsObj = isPlainObject(collInfo)
    const collName = module.context.collectionName(`_test_${collIsObj ? collInfo.name : collInfo}`)

    TEST_DATA_COLLECTIONS[key] = collName

    let coll = db._collection(collName)
    if (!coll) {
      coll = collFn.call(db, collName)
      console.log(`Created ${collName}`)
    } else if (truncate) {
      db._truncate(coll)
      console.log(`Truncated ${collName}`)
    }

    get(collInfo, 'indexes', []).forEach(index => coll.ensureIndex(index))
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

function truncateServiceCollections () {
  forEach(SERVICE_COLLECTIONS, collName => {
    db._truncate(collName)
  })
}

// Public
const TEST_DATA_COLLECTION_SNAPSHPOT_INTERVAL = 2

function setup ({
  forceInit = false,
  ensureSampleDataLoad = false,
  ensureFlightDataLoad = false
} = {}) {
  setTrace({})

  let sampleDataLoadMessages = null
  let flightDataLoadMessages = null

  if (forceInit || !collectionsInitialized) {
    ensureTestDocumentCollections()
    ensureTestEdgeCollections()
    truncateServiceCollections()
    setSnapshotIntervals()

    collectionsInitialized = true
    sampleDataLoaded = false
    flightDataLoaded = false
  }

  if (ensureSampleDataLoad && !sampleDataLoaded) {
    const results = loadSampleData(TEST_DATA_COLLECTIONS)
    sampleDataRefs = omit(results, 'messages')
    sampleDataLoadMessages = results.messages
    sampleDataLoaded = true
  }

  if (ensureFlightDataLoad && !flightDataLoaded) {
    const results = loadFlightData(TEST_DATA_COLLECTIONS)
    flightDataRefs = omit(results, 'messages')
    flightDataLoadMessages = results.messages
    flightDataLoaded = true
  }

  return {
    sampleDataLoaded,
    sampleDataLoadMessages,
    flightDataLoaded,
    flightDataLoadMessages
  }
}

function teardown () {
  clearTraceContext()
}

function getSampleDataRefs () {
  return sampleDataRefs
}

function getFlightDataRefs () {
  return flightDataRefs
}

module.exports = {
  TEST_DATA_COLLECTIONS,
  TEST_DATA_COLLECTION_SNAPSHPOT_INTERVAL,
  setup,
  teardown,
  getSampleDataRefs,
  getFlightDataRefs
}
