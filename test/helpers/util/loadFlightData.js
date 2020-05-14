'use strict'

const { join } = require('path')
const { createMultiple, createSingle } = require('../../../lib/handlers/createHandlers')
const { replaceSingle } = require('../../../lib/handlers/replaceHandlers')
const { removeMultiple } = require('../../../lib/handlers/removeHandlers')
const { getCRUDErrors } = require('../../../lib/routes/helpers')
const { patch } = require('jiff')
const { find, pick, mapValues, random } = require('lodash')
const dd = require('dedent')
const { db, query } = require('@arangodb')

// Public
module.exports = function loadFlightData (testDataCollections) {
  console.log('Starting flight data load...')

  // Define collection metadata
  const flightDataCollections = pick(testDataCollections, 'airports', 'flights')
  const colls = mapValues(flightDataCollections, collName => db._collection(collName))
  const { airports, flights } = colls

  // Init results
  const results = {
    messages: [],
    collections: {
      airports: airports.name(),
      flights: flights.name()
    }
  }

  // Load and insert data
  const resourcePath = '../../../test/resources'
  let filename = 'KSP_Airports.json'
  let docCount
  let insertCount
  let errorCount
  let pathParams = {
    collection: airports.name()
  }

  // Load airports
  const airportData = require(join(resourcePath, filename))
  docCount = airportData.length

  let result = createMultiple({ pathParams, body: airportData })
  let errors = getCRUDErrors(result)

  errorCount = errors.length
  insertCount = docCount - errorCount

  let message = `Inserted ${insertCount} out of ${docCount} documents into ${airports.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)

  // Load flights
  filename = 'KSP_Flight_Commands.json'
  pathParams = {
    collection: flights.name()
  }
  docCount = insertCount = errorCount = 0

  let replaceCount = 0
  const flightCommands = require(join(resourcePath, filename))
  flightCommands.forEach(item => {
    docCount++

    const from = find(item, { path: '/_from' })
    const to = find(item, { path: '/_to' })
    if (from) {
      from.value = `${airports.name()}/${from.value}`
    }
    if (to) {
      to.value = `${airports.name()}/${to.value}`
    }

    let flight = (item.event === 'updated') ? flights.document(item.key) : {}
    flight = patch(item.command, flight, {})

    try {
      if (item.event === 'created') {
        createSingle({ pathParams, body: flight }, { silent: true })
        insertCount++
      } else {
        replaceSingle({ pathParams, body: flight }, { silent: true })
        replaceCount++
      }
    } catch (e) {
      errorCount++
      console.error(e.message, e.stack)
    }
  })

  message = dd`
    Inserted ${insertCount} nodes, replaced ${replaceCount} nodes based on ${docCount} commands,
    into ${flights.name()} with ${errorCount} errors
  `
  console.log(message)
  results.messages.push(message)

  // Delete some flights
  let dCount = random(flights.count())
  let dKeys = query`
    for f in ${flights}
    sort rand()
    limit ${dCount}
    
    return keep(f, '_key')
  `.toArray()

  docCount = dKeys.length
  result = removeMultiple({ pathParams, body: dKeys })
  errors = getCRUDErrors(result)
  errorCount = errors.length
  let removeCount = docCount - errorCount

  message = `Removed ${removeCount} documents from ${flights.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)

  // Delete some airports
  dCount = random(airports.count())
  dKeys = query`
    for a in ${airports}
    sort rand()
    limit ${dCount}

    return keep(a, '_key')
  `.toArray()

  docCount = dKeys.length
  pathParams = {
    collection: airports.name()
  }
  result = removeMultiple({ pathParams, body: dKeys })
  errors = getCRUDErrors(result)
  errorCount = errors.length
  removeCount = docCount - errorCount

  message = `Removed ${removeCount} documents from ${airports.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)

  return results
}
