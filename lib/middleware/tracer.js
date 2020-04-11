'use strict'

const { Tags: { HTTP_METHOD, SPAN_KIND, HTTP_STATUS_CODE, ERROR }, globalTracer, FORMAT_HTTP_HEADERS } = require(
  'opentracing')
const { utils: { parseTraceHeaders, getTraceDirectiveFromHeaders, startSpan } } = require('foxx-tracing')

const tracer = globalTracer()

module.exports = function trace (req, res, next) {
  const traceHeaders = parseTraceHeaders(req.headers)
  const forceTrace = getTraceDirectiveFromHeaders(traceHeaders)

  const options = {
    tags: {
      [HTTP_METHOD]: req.method,
      [SPAN_KIND]: 'server',
      path: req.path,
      pathParams: req.pathParams,
      queryParams: req.queryParams
    }
  }

  const rootContext = tracer.extract(FORMAT_HTTP_HEADERS, traceHeaders)
  if (rootContext) {
    options.childOf = rootContext
  }

  const span = startSpan(`api${req.path}`, false, options, forceTrace)
  let ex = null
  try {
    next()
  } catch (e) {
    span.setTag(ERROR, true)
    span.log({
      errorMessage: e.message
    })

    ex = e
  } finally {
    span.setTag(HTTP_STATUS_CODE, res.statusCode)
    // span.log({
    //   size: res.body.toString().length
    // })
    span.finish()
  }

  if (ex) {
    throw ex
  }
}
