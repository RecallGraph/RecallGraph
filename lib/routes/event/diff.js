'use strict'

const { JoiRG } = require('../helpers')
const { diff } = require('../../handlers/diffHandlers')
const { PATH_SCHEMA } = require('../schemas')
const dd = require('dedent')

module.exports = router => {
  const filterSchema = JoiRG.string().filter().empty('')
  const reqBodySchema = JoiRG.object().keys({
    path: PATH_SCHEMA,
    postFilter: filterSchema
  })

  buildEndpoint(router.get('/diff', processDiffRequest, 'diffGet'))
    .queryParam('path', PATH_SCHEMA, 'The path pattern to pick nodes whose diffs should be returned.')
    .queryParam('postFilter', filterSchema, 'The optional post-filter expression to apply on the diffs.')

    .summary('Get diffs (path & postFilter param in query).')

  buildEndpoint(router.post('/diff', processDiffRequest, 'diffPost'))
    .body(reqBodySchema, dd`
      The path pattern to pick nodes whose diffs should be returned, and the optional post-filter expression to apply on
      them. (e.g. \`{"path": "/c/*raw_data*", "postFilter": "x == 2 && y < 1"}\`)
    `)

    .summary('Get diffs (path & postFilter param in body).')

  console.debug('Loaded "diff" routes')
}

function processDiffRequest (req, res) {
  res.status(200).json(diff(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam('since', JoiRG.number(), dd`
      The unix timestamp (sec) for the earliest matching event from which to start fetching diffs (inclusive).
      Precision: 0.1μs. Example: since=1581583228.2800217
    `)

    .queryParam('until', JoiRG.number(), dd`
      The unix timestamp (sec) for the latest matching event until which to keep fetching diffs (exclusive).
      Precision: 0.1μs. Example: until=1581583228.2800217
    `)

    .queryParam('sort', JoiRG.string().valid('asc', 'desc'),
      'The primary sort order of records in the result set, sorted by node ID. Default: `asc`.')

    .queryParam('skip', JoiRG.number().integer().min(0),
      'The number records to skip/omit from the result set, starting from the first. Falsey implies none.')

    .queryParam('limit', JoiRG.number().integer().min(0),
      'The number records to keep in the result set, starting from `skip` or `0`. Falsey implies all.')

    .queryParam('reverse', JoiRG.boolean(), dd`
      Whether to invert the individual diffs, so that they can be applied in reverse order. This also reverses the order
      of diffs within a node.
    `)

    .response(200, ['application/json'], 'The diff was successfully generated.')
    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(500, 'The operation failed.')

    .description(dd`
      Returns diffs for nodes matching the given path pattern and the sorting/slicing/post-filter constraints.

      Also see:

      1. https://docs.recallgraph.tech/getting-started/terminology#event

      2. https://docs.recallgraph.tech/getting-started/terminology#diff

      3. https://docs.recallgraph.tech/getting-started/terminology#path

      4. https://docs.recallgraph.tech/getting-started/terminology/sorting

      5. https://docs.recallgraph.tech/getting-started/terminology/slicing

      6. https://docs.recallgraph.tech/getting-started/terminology/post-filters
    `)

    .tag('Event')
}
