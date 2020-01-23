'use strict'

const createRouter = require('@arangodb/foxx/router')

const router = createRouter()
require('./filter')(router)
require('./traverse')(router)

module.exports = router
