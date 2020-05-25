'use strict'

const createRouter = require('@arangodb/foxx/router')

const router = createRouter()
require('./log')(router)
require('./diff')(router)
require('./sync')(router)

module.exports = router
