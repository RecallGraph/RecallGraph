'use strict'

/*
 # Provider Exports
 RecallGraph exports all its HTTP API methods as providers. The HTTP API methods are grouped into 3 categories,
 viz. _Document_, _Event_ and _History_. The functionality behind each of the API methods in these categories
 can also be accessed directly by any Foxx service that declares RecallGraph as dependency. For more
 information, see the relevant section in
 [ArangoDB Docs](https://www.arangodb.com/docs/stable/foxx-guides-dependencies.html).

 The exported methods, along with their linked documentation, are listed below.
 */

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
  // ## Document Category

  /*
   ### Create Provider
   Create a document (vertex or edge).
   See [lib/handlers/createHandlers.js](createHandlers.html)
   */
  create: createProvider,

  /*
   ### Replace Provider
   Replace a document or documents (vertex or edge).
   See [lib/handlers/replaceHandlers.js](replaceHandlers.html)
   */
  replace: replaceProvider,

  /*
   ### Update Provider
   Update a document or documents (vertex or edge).
   See [lib/handlers/updateHandlers.js](updateHandlers.html)
   */
  update: updateProvider,

  /*
   ### Remove Provider
   Remove a document or documents (vertex or edge).
   See [lib/handlers/removeHandlers.js](removeHandlers.html)
   */
  remove: removeProvider,

  /*
   ### Restore Provider
   Restore deleted nodes.
   See [lib/handlers/restoreHandlers.js](restoreHandlers.html)
   */
  restore: restoreProvider,

  // ## Event Category

  /*
   ### Log Provider
   Get event logs.
   See [lib/handlers/logHandlers.js](logHandlers.html)
   */
  log: logProvider,

  /*
   ### Diff Provider
   Get diffs between successive events.
   See [lib/handlers/diffHandlers.js](diffHandlers.html)
   */
  diff: diffProvider,

  /*
   ### Commit Provider
   Commit nodes having states that are AHEAD of the log.
   See [lib/handlers/commitHandlers.js](commitHandlers.html)
   */
  commit: commitProvider,

  // ## History Category

  /*
   ### Show Provider
   Show node states at a given timestamp.
   See [lib/handlers/showHandlers.js](showHandlers.html)
   */
  show: showProvider,

  /*
   ### Traverse Provider
   Traverse historic graph states.
   See [lib/handlers/traverseHandlers.js](traverseHandlers.html)
   */
  traverse: traverseProvider,

  /*
   ### k Shortest Paths Provider
   _k_ shortest historic paths between vertices.
   See [lib/handlers/kShortestPathsHandlers.js](kShortestPathsHandlers.html)
   */
  kShortestPaths: kspProvider,

  /*
   ### Purge Provider
   Purge node history.
   See [lib/handlers/purgeHandlers.js](purgeHandlers.html)
   */
  purge: purgeProvider
}
