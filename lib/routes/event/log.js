'use strict'

const { joiCG } = require('../helpers')
const { log } = require('../../handlers/logHandlers')
const { pathSchema } = require('../helpers')

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

  buildEndpoint(router.get('/log', processLogRequest, 'logGet'))
    .queryParam('path', pathSchema, 'The path pattern to pick nodes whose states should be returned.')
    .queryParam('postFilter', filterSchema.optional(), 'The optional post-filter expression to apply on the log.')
    .summary('Get event logs (path & postFilter param in query).')

  buildEndpoint(router.post('/log', processLogRequest, 'logPost'))
    .body(reqBodySchema, `${bodyDesc}  (e.g. \`{"path": "/c/*raw_data*", "filter": "x == 2 && y < 1"}\`)`)
    .summary('Get event logs (path & postFilter param in body).')

  console.debug('Loaded "log" routes')
}

function processLogRequest (req, res) {
  res.status(200).json(log(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam(
      'since',
      joiCG
        .number()
        .precision(5)
        .optional(),
      'The unix timestamp (sec) starting from which to return events. Precision: 0.1μs. Example: since=1581583228.2800217'
    )
    .queryParam(
      'until',
      joiCG
        .number()
        .precision(5)
        .optional(),
      'The unix timestamp (sec) until which to return events. Precision: 0.1μs. Example: until=1581583228.2800217'
    )
    .queryParam(
      'sort',
      joiCG
        .string()
        .valid('asc', 'desc')
        .optional(),
      'The outer/primary sort order of records in the result set, sorted by `event.ctime`(groupBy=null) or aggregation' +
      ' key (groupBy is not null and countsOnly is false) or aggregated total (groupBy is not null and countsOnly is true).' +
      ' Default: "desc" for `event.ctime` or aggregated total, "asc" otherwise.'
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
        .valid('node', 'collection', 'event', 'type')
        .optional(),
      'The parameter on which to group records in the result set.'
    )
    .queryParam(
      'countsOnly',
      joiCG.boolean().optional(),
      'If "groupBy" is specified, this parameter determines whether to return aggregated event totals' +
      ' (countsOnly=true), or entire event lists per group (countsOnly=false).'
    )
    .queryParam(
      'groupSort',
      joiCG
        .string()
        .valid('asc', 'desc')
        .optional(),
      'The inner/secondary sort order of records in a group (if "groupBy" is specified and "countsOnly" is falsey),' +
      ' sorted by `event.ctime`. Default: "desc".'
    )
    .queryParam(
      'groupSkip',
      joiCG
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to skip/omit from each group of the result set (if "groupBy" is specified and "countsOnly"' +
      ' is ' +
      'falsey), starting from the first. Falsey implies none.'
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
    .queryParam(
      'returnCommands',
      joiCG.boolean().optional(),
      'If "groupBy" is specified and "countsOnly" is falsey, or if "groupBy" is null, this parameter determines' +
      ' whether to return the corresponding command for each event). Falsey implies no.'
    )
    .response(200, ['application/json'], 'The log was successfully generated.')
    .error(500, 'The operation failed.')
    .description(
      'Returns event logs for nodes matching the given path pattern and the aggregating/sorting/slicing constraints.'
    )
    .tag('Event')
}
