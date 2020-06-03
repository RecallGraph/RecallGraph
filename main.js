'use strict'

const createRouter = require('@arangodb/foxx/router')
const path = require('path')
const fs = require('fs')
const {
  utils: { setEndpointTraceHeaders, initTracer }, middleware
} = require('foxx-tracing')
const providers = require('lib/handlers/providers')

initTracer()
module.context.use(middleware)

const router = createRouter()
const routeBase = `${__dirname}/lib/routes`
const routes = fs
  .list(routeBase)
  .filter(route => fs.isDirectory(`${routeBase}/${route}`))
routes.forEach(route => {
  const mountPath = path.basename(route, '.js')
  const childRouter = require(`./lib/routes/${route}`)

  const endpoint = router.use(`/${mountPath}`, childRouter)
  setEndpointTraceHeaders(endpoint)
})

module.context.use(router)

module.exports = providers
