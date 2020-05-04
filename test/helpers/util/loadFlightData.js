'use strict'

const { join } = require('path')
const { createMultiple, createSingle } = require('../../../lib/handlers/createHandlers')
const { replaceSingle } = require('../../../lib/handlers/replaceHandlers')
const { getCRUDErrors } = require('../../../lib/routes/helpers')
const { patch } = require('jiff')
const { find, pick, mapValues } = require('lodash')
const dd = require('dedent')
const { db } = require('@arangodb')

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

  const result = createMultiple({ pathParams, body: airportData })
  const errors = getCRUDErrors(result)

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
  flightCommands.forEach(commands => {
    let flight = {}
    for (let i = 0; i < commands.length; i++) {
      docCount++

      const command = commands[i]
      if (i === 0) {
        const from = find(command, { path: '/_from' })
        const to = find(command, { path: '/_to' })

        from.value = `${airports.name()}/${from.value}`
        to.value = `${airports.name()}/${to.value}`
      }

      flight = patch(command, flight, {})
      try {
        if (i === 0) {
          flight = createSingle({ pathParams, body: flight }, { returnNew: true }).new
          insertCount++
        } else {
          flight = replaceSingle({ pathParams, body: flight }, { returnNew: true }).new
          replaceCount++
        }
      } catch (e) {
        errorCount++
        console.error(e.message, e.stack)

        break
      }
    }
  })

  message = dd`
    Inserted ${insertCount} nodes, replaced ${replaceCount} nodes based on ${docCount} commands,
    into ${flights.name()} with ${errorCount} errors
  `
  console.log(message)
  results.messages.push(message)

  return results
}
