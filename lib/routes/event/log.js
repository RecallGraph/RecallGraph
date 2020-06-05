'use strict'

const { JoiRG } = require('../helpers')
const { log } = require('../../handlers/logHandlers')
const { PATH_SCHEMA } = require('../constants')
const dd = require('dedent')

const filterSchema = JoiRG.string().filter().optional()
const reqBodySchema = JoiRG.object().keys({
  path: PATH_SCHEMA,
  postFilter: filterSchema
})

module.exports = router => {
  buildEndpoint(router.get('/log', processLogRequest, 'logGet'))
    .queryParam('path', PATH_SCHEMA, 'The path pattern to pick nodes whose logs should be returned.')
    .queryParam('postFilter', filterSchema, 'The optional post-filter expression to apply on the log.')

    .summary('Get event logs (path & postFilter param in query).')

  buildEndpoint(router.post('/log', processLogRequest, 'logPost'))
    .body(reqBodySchema, dd`
      The path pattern to pick nodes whose logs should be returned, and the optional post-filter expression to apply on
      them. (e.g. \`{"path": "/c/*raw_data*", "postFilter": "x == 2 && y < 1"}\`)
    `)

    .summary('Get event logs (path & postFilter param in body).')

  console.debug('Loaded "log" routes')
}

function processLogRequest (req, res) {
  res.status(200).json(log(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam('since', JoiRG.number(),
      'The unix timestamp (sec) starting from which to return events. Precision: 0.1μs. Example: since=1581583228.2800217')

    .queryParam('until', JoiRG.number(),
      'The unix timestamp (sec) until which to return events. Precision: 0.1μs. Example: until=1581583228.2800217')

    .queryParam('sort', JoiRG.string().valid('asc', 'desc'), dd`
      The outer/primary sort order of records in the result set, sorted by \`event.ctime\`(\`groupBy==null\`) or
      aggregation key (\`groupBy\` is not \`null\` and \`countsOnly\` is \`false\`) or aggregated total (\`groupBy\` is
      not null and \`countsOnly\` is \`true\`). Default: \`desc\` for \`event.ctime\` or aggregated total, \`asc\`
      otherwise.
    `)

    .queryParam('skip', JoiRG.number().integer().min(0),
      'The number records to skip/omit from the result set, starting from the first. Falsey implies none.')

    .queryParam('limit', JoiRG.number().integer().min(0),
      'The number records to keep in the result set, starting from `skip` or `0`. Falsey implies all.')

    .queryParam('groupBy', JoiRG.string().valid('node', 'collection', 'event', 'type'), dd`
      The parameter on which to group records in the result set. One of \`node\`, \`collection\`, \`event\` or \`type\`.
    `)

    .queryParam('countsOnly', JoiRG.boolean(), dd`
      If \`groupBy\` is specified, this parameter determines whether to return aggregated event totals
      (\`countsOnly==true\`), or entire event lists per group (\`countsOnly==false\`).
    `)

    .queryParam('groupSort', JoiRG.string().valid('asc', 'desc'), dd`
      The inner/secondary sort order of records in a group (if \`groupBy\` is specified and \`countsOnly\` is falsey),
      sorted by \`event.ctime\`. Default: \`desc\`.
    `)

    .queryParam('groupSkip', JoiRG.number().integer().min(0), dd`
      The number records to skip/omit from each group of the result set (if \`groupBy\` is specified and \`countsOnly\`
      is falsey), starting from the first. Falsey implies none.
    `)

    .queryParam('groupLimit', JoiRG.number().integer().min(0), dd`
      The number records to keep in each group of the result set (if \`groupBy\` is specified and \`countsOnly\` is
      falsey), starting from \`groupSkip\` or \`0\`. Falsey implies all.
    `)

    .response(200, ['application/json'], 'The log was successfully generated.')
    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(500, 'The operation failed.')

    .description(dd`
      Returns event logs for nodes matching the given path pattern and the aggregating/sorting/slicing/post-filter
      constraints.

      Also see:

      1. https://docs.recallgraph.tech/getting-started/terminology#event

      2. https://docs.recallgraph.tech/getting-started/terminology#path

      3. https://docs.recallgraph.tech/getting-started/terminology/grouping

      4. https://docs.recallgraph.tech/getting-started/terminology/sorting

      5. https://docs.recallgraph.tech/getting-started/terminology/slicing

      6. https://docs.recallgraph.tech/getting-started/terminology/post-filters
    `)

    .tag('Event')
}
