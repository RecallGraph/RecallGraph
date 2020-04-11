'use strict'

const createRouter = require('@arangodb/foxx/router')
const path = require('path')
const fs = require('fs')
const tracerMW = require('./lib/middleware/tracer')
const { utils: { setEndpointTraceHeaders, initTracer } } = require('foxx-tracing')

initTracer()
module.context.use(tracerMW)

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
