'use strict'

const createRouter = require('@arangodb/foxx/router')

const router = createRouter()
require('./show')(router)
require('./traverse')(router)
require('./kShortestPaths')(router)
require('./purge')(router)

module.exports = router
