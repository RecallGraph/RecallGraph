'use strict'

const { commitProvider } = require('./commitHandlers')
const { createProvider } = require('./createHandlers')
const { diffProvider } = require('./diffHandlers')
const { kspProvider } = require('./kShortestPathsHandlers')
const { logProvider } = require('./logHandlers')
const { purgeProvider } = require('./purgeHandlers')
const { removeProvider } = require('./removeHandlers')
const { replaceProvider } = require('./replaceHandlers')
const { restoreProvider } = require('./restoreHandlers')
const { showProvider } = require('./showHandlers')
const { traverseProvider } = require('./traverseHandlers')
const { updateProvider } = require('./updateHandlers')

module.exports = {
  // Document
  create: createProvider,
  replace: replaceProvider,
  update: updateProvider,
  remove: removeProvider,
  restore: restoreProvider,

  // Event
  log: logProvider,
  diff: diffProvider,
  commit: commitProvider,

  // History
  show: showProvider,
  traverse: traverseProvider,
  kShortestPaths: kspProvider,
  purge: purgeProvider
}
