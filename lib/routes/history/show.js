'use strict'

const { joiCG } = require('../helpers')
const { show } = require('../../../lib/handlers/showHandlers')
const { pathSchema } = require('../../../lib/routes/helpers')

module.exports = router => {
  const bodyDesc =
    'The path pattern to pick nodes whose states should be returned, and the optional post-filter expression to' +
    ' apply on them.'
  const filterSchema = joiCG.string().filter()
  const reqBodySchema = joiCG.object().keys({
    path: pathSchema,
    postFilter: filterSchema.required()
  })
    .optionalKeys('postFilter')

  buildEndpoint(router.get('/show', processShowRequest, 'showGet'))
    .queryParam('path', pathSchema, 'The path pattern to pick nodes whose states should be returned.')
    .queryParam('postFilter', filterSchema.optional(), 'The optional post-filter expression to apply on the nodes.')
    .summary('Show node states (path & postFilter param in query).')

  buildEndpoint(router.post('/show', processShowRequest, 'showPost'))
    .body(reqBodySchema, `${bodyDesc}  (e.g. \`{"path": "/c/*raw_data*", "filter": "x == 2 && y < 1"}\`)`)
    .summary('Show node states (path & postFilter param in body).')

  console.debug('Loaded "show" routes')
}

function processShowRequest (req, res) {
  res.status(200).json(show(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam(
      'timestamp',
      joiCG
        .number()
        .precision(5)
        .optional(),
      'The unix timestamp (sec) for which to show node states. Precision: 0.1μs. Example: since=1581583228.2800217.' +
      ' Default: Current Time'
    )
    .queryParam(
      'sort',
      joiCG
        .string()
        .valid('asc', 'desc')
        .optional(),
      'The outer/primary sort order of records in the result set. When "countsOnly" is true, it is sorted first by the' +
      ' "total" in the given sort direction, then by the group key or node ID ("asc") depending on whether grouping' +
      ' was enabled. When "countsOnly" is false, it sorts by group key or node ID in the given the sort direction.' +
      ' Default: "desc" when countsOnly is true, "asc" otherwise.'
    )
    .queryParam(
      'skip',
      joiCG
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to skip/omit from the result set, starting from the first. Falsey implies none.'
    )
    .queryParam(
      'limit',
      joiCG
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to keep in the result set, starting from "skip"/0. Falsey implies all.'
    )
    .queryParam(
      'groupBy',
      joiCG
        .string()
        .valid('collection', 'type')
        .optional(),
      'The parameter on which to group records in the result set.'
    )
    .queryParam(
      'countsOnly',
      joiCG.boolean().optional(),
      'Determines whether to return aggregated event totals (grouped or overall depending on "groupBy")' +
      ', or entire event lists.'
    )
    .queryParam(
      'groupSort',
      joiCG
        .string()
        .valid('asc', 'desc')
        .optional(),
      'The inner/secondary sort order of records in a group (if "groupBy" is specified and "countsOnly" is falsey),' +
      ' sorted by `_id`. Default: "asc".'
    )
    .queryParam(
      'groupSkip',
      joiCG
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to skip/omit from each group of the result set (if "groupBy" is specified and "countsOnly"' +
      ' is falsey), starting from the first. Falsey implies none.'
    )
    .queryParam(
      'groupLimit',
      joiCG
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to keep in each group of the result set (if "groupBy" is specified and "countsOnly" is ' +
      'falsey), starting from "groupSkip"/0. Falsey implies all.'
    )
    .response(200, ['application/json'], 'The states were successfully generated.')
    .error(500, 'The operation failed.')
    .description(
      'Returns past states for nodes matching the given path pattern and the sorting/slicing constraints.'
    )
    .tag('History')
}
