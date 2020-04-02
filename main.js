'use strict'

const createRouter = require('@arangodb/foxx/router')
const path = require('path')
const fs = require('fs')
const initTrace = require('./lib/middleware/tracer')

module.context.use(initTrace)

const router = createRouter()
const routeBase = `${__dirname}/lib/routes`
const routes = fs
  .list(routeBase)
  .filter(route => fs.isDirectory(`${routeBase}/${route}`))
routes.forEach(route => {
  const mountPath = path.basename(route, '.js')
  const childRouter = require(`./lib/routes/${route}`)
  router.use(`/${mountPath}`, childRouter)
})

module.context.use(router)
