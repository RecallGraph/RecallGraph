'use strict'

const createRouter = require('@arangodb/foxx/router')

const router = createRouter()
require('./create')(router)
require('./replace')(router)
require('./remove')(router)
require('./update')(router)
require('./restore')(router)

module.exports = router
