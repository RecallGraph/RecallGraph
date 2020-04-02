'use strict'

const { Tags: { HTTP_METHOD, SPAN_KIND, HTTP_STATUS_CODE } } = require('opentracing')
const { startSpan, endSpan } = require('../helpers')

module.exports = function trace (req, res, next) {
  const root = startSpan(`api${req.path}`, {
    tags: {
      [HTTP_METHOD]: req.method,
      [SPAN_KIND]: 'server',
      path: req.path,
      pathParams: req.pathParams,
      queryParams: req.queryParams
    }
  }, req.queryParams.traceOverride)

  next()

  root.setTag(HTTP_STATUS_CODE, res.statusCode)
  root.log({
    size: res.body.toString().length
  })
  endSpan(root)
}
