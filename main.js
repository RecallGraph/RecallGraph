'use strict'

/*
 # RecallGraph
 ## A versioning data store for time-variant graph data.
 ### Software Version: 1.0.0

 RecallGraph is a _versioned-graph_ data store - it retains all changes that its data (vertices and edges)
 have gone through to reach their current state. It supports _point-in-time_ graph traversals, letting the
 user query any past state of the graph just as easily as the present.

 **See Also**
 1. [Project Home](https://github.com/RecallGraph/RecallGraph)
 1. [Documentation](https://docs.recallgraph.tech/)
 */

const createRouter = require('@arangodb/foxx/router')
const path = require('path')
const fs = require('fs')
const {
  utils: { setEndpointTraceHeaders, initTracer }, middleware
} = require('foxx-tracing')
const providers = require('./lib/handlers/providers')

/*
 ## Tracing and Instrumentation
 RecallGraph supports distributed tracing in its HTTP API, based on the
 [OpenTracing](https://opentracing.io/) standard. See the
 [docs](https://docs.recallgraph.tech/working-with-recallgraph/advanced-guide/tracing) for how to
 enable and record traces for your application.
 */
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

/*
 ## Provider Exports
 RecallGraph exports all its HTTP API methods as providers. This lets other Foxx services declare a
 dependency on RecallGraph, after which they can directly invoke its exported API methods. For more
 information, see the relevant section in
 [ArangoDB Docs](https://www.arangodb.com/docs/stable/foxx-guides-dependencies.html).

 **See [providers.js](lib/handlers/providers.html) for the full list of available exports.**
 */
module.exports = providers
