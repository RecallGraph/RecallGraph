'use strict'

const { JoiRG } = require('../helpers')
const { show } = require('../../../lib/handlers/showHandlers')
const { PATH_SCHEMA } = require('../schemas')
const dd = require('dedent')

module.exports = router => {
  const filterSchema = JoiRG.string().filter().empty('')
  const reqBodySchema = JoiRG.object().keys({
    path: PATH_SCHEMA,
    postFilter: filterSchema
  })

  buildEndpoint(router.get('/show', processShowRequest, 'showGet'))
    .queryParam('path', PATH_SCHEMA, 'The path pattern to pick nodes whose states should be returned.')
    .queryParam('postFilter', filterSchema, 'The optional post-filter expression to apply on the nodes.')

    .summary('Show node states (path & postFilter param in query).')

  buildEndpoint(router.post('/show', processShowRequest, 'showPost'))
    .body(reqBodySchema, dd`
      The path pattern to pick nodes whose states should be returned, and the optional post-filter expression to apply
      on them. (e.g. \`{"path": "/c/*raw_data*", "postFilter": "x == 2 && y < 1"}\`)
    `)

    .summary('Show node states (path & postFilter param in body).')

  console.debug('Loaded "show" routes')
}

function processShowRequest (req, res) {
  res.status(200).json(show(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam('timestamp', JoiRG.number(), dd`
      The unix timestamp (sec) for which to show node states. Precision: 0.1μs. Example: since=1581583228.2800217.
      Default: Current Time
    `)

    .queryParam('sort', JoiRG.string().valid('asc', 'desc'), dd`
      The outer/primary sort order of records in the result set. When \`groupBy\` is not \`null\` and \`countsOnly\` is
      true, it is sorted first by the aggregated total in the given sort direction, then by the group key (\`asc"\`).
      When \`countsOnly\` is false, it sorts by group key (\`groupBy\` != \`null\`) or node ID (\`groupBy\` == \`null\`)
      in the given the sort direction. Default: \`desc\` when countsOnly is true, \`asc\` otherwise.
    `)

    .queryParam('skip', JoiRG.number().integer().min(0),
      'The number records to skip/omit from the result set, starting from the first. Falsey implies none.')

    .queryParam('limit', JoiRG.number().integer().min(0),
      'The number records to keep in the result set, starting from `skip` or `0`. Falsey implies all.')

    .queryParam('groupBy', JoiRG.string().valid('collection', 'type'),
      'The parameter on which to group records in the result set. One of `collection` or `type`.')

    .queryParam('countsOnly', JoiRG.boolean(), dd`
      Determines whether to return aggregated event totals (grouped or overall depending on \`groupBy\`), or entire
      event lists.
    `)

    .queryParam('groupSort', JoiRG.string().valid('asc', 'desc'), dd`
      The inner/secondary sort order of records in a group (if \`groupBy\` is specified and \`countsOnly\` is falsey),
      sorted by \`_id\`. Default: \`asc\`.
    `)

    .queryParam('groupSkip', JoiRG.number().integer().min(0), dd`
      The number records to skip/omit from each group of the result set (if \`groupBy\` is specified and \`countsOnly\`
      is falsey), starting from the first. Falsey implies none.
    `)

    .queryParam('groupLimit', JoiRG.number().integer().min(0), dd`
      The number records to keep in each group of the result set (if \`groupBy\` is specified and \`countsOnly\` is
      falsey), starting from \`groupSkip\` or \`0\`. Falsey implies all.
    `)

    .response(200, ['application/json'], 'The states were successfully generated.')
    .error(400, 'Invalid request body/params. Response body contains the error details.')
    .error(500, 'The operation failed.')

    .description(dd`
      Returns past states for nodes matching the given path pattern and the aggregating/sorting/slicing/post-filter
      constraints.

      Also see:

      1. https://docs.recallgraph.tech/getting-started/terminology#event

      2. https://docs.recallgraph.tech/getting-started/terminology#path

      3. https://docs.recallgraph.tech/getting-started/terminology/grouping

      4. https://docs.recallgraph.tech/getting-started/terminology/sorting

      5. https://docs.recallgraph.tech/getting-started/terminology/slicing

      6. https://docs.recallgraph.tech/getting-started/terminology/post-filters
    `)

    .tag('History')
}
