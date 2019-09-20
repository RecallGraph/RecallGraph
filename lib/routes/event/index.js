'use strict'

// noinspection NpmUsedModulesInstalled
const createRouter = require('@arangodb/foxx/router')

const router = createRouter()
require('./log')(router)
require('./diff')(router)
require('./show')(router)

module.exports = router
