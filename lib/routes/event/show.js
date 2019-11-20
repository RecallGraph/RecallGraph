'use strict'

const joi = require('joi')
const { show } = require('../../handlers/showHandlers')
const { pathSchema } = require('../helpers')

module.exports = router => {
  const pathDesc =
    'The path pattern to pick nodes whose states should be returned.'
  const reqBodySchema = joi.object().keys({ path: pathSchema })

  buildEndpoint(router.get('/show', processShowRequest, 'showGet'))
    .queryParam('path', pathSchema, pathDesc)
    .summary('Show node states (path param in query).')

  buildEndpoint(router.post('/show', processShowRequest, 'showPost'))
    .body(reqBodySchema, `${pathDesc}  (e.g. \`{"path": "/c/*raw_data*"}\`)`)
    .summary('Show node states (path param in body).')

  console.debug('Loaded "show" routes')
}

function processShowRequest (req, res) {
  res.status(200).json(show(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam(
      'timestamp',
      joi
        .number()
        .precision(5)
        .optional(),
      'The unix timestamp (sec) for which to show node states. Precision: 10μs. Example: since=1547560124.43204'
    )
    .queryParam(
      'sort',
      joi
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
      joi
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to skip/omit from the result set, starting from the first. Falsey implies none.'
    )
    .queryParam(
      'limit',
      joi
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to keep in the result set, starting from "skip"/0. Falsey implies all.'
    )
    .queryParam(
      'groupBy',
      joi
        .string()
        .valid('collection', 'type')
        .optional(),
      'The parameter on which to group records in the result set.'
    )
    .queryParam(
      'countsOnly',
      joi.boolean().optional(),
      'Determines whether to return aggregated event totals (grouped or overall depending on "groupBy")' +
      ', or entire event lists.'
    )
    .queryParam(
      'groupSort',
      joi
        .string()
        .valid('asc', 'desc')
        .optional(),
      'The inner/secondary sort order of records in a group (if "groupBy" is specified and "countsOnly" is falsey),' +
      ' sorted by `_id`. Default: "asc".'
    )
    .queryParam(
      'groupSkip',
      joi
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to skip/omit from each group of the result set (if "groupBy" is specified and "countsOnly"' +
      ' is falsey), starting from the first. Falsey implies none.'
    )
    .queryParam(
      'groupLimit',
      joi
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
    .tag('Event')
}
