'use strict'

const joi = require('joi')
const { log } = require('../../handlers/logHandlers')
const { pathSchema } = require('../helpers')

module.exports = router => {
  const pathDesc =
          'The path pattern to pick nodes whose logs should be returned.'
  const reqBodySchema = joi.object().keys({ path: pathSchema })

  buildEndpoint(router.get('/log', processLogRequest, 'logGet'))
    .queryParam('path', pathSchema, pathDesc)
    .summary('Get event logs (path param in query).')

  buildEndpoint(router.post('/log', processLogRequest, 'logPost'))
    .body(reqBodySchema, `${pathDesc}  (e.g. \`{"path": "/c/*raw_data*"}\`)`)
    .summary('Get event logs (path param in body).')

  console.debug('Loaded "log" routes')
}

function processLogRequest (req, res) {
  res.status(200).json(log(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam(
      'since',
      joi
        .number()
        .precision(5)
        .optional(),
      'The unix timestamp (sec) starting from which to return events. Precision: 10μs. Example: since=1547560124.43204'
    )
    .queryParam(
      'until',
      joi
        .number()
        .precision(5)
        .optional(),
      'The unix timestamp (sec) until which to return events. Precision: 10μs. Example: until=1547572124.23412'
    )
    .queryParam(
      'sort',
      joi
        .string()
        .valid('asc', 'desc')
        .optional(),
      'The outer/primary sort order of records in the result set, sorted by `event.ctime`(groupBy=null) or aggregation' +
      ' key (groupBy is not null and countsOnly is false) or aggregated total (groupBy is not null and countsOnly is true).' +
      ' Default: "desc" for `event.ctime` or aggregated total, "asc" otherwise.'
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
        .valid('node', 'collection', 'event')
        .optional(),
      'The parameter on which to group records in the result set.'
    )
    .queryParam(
      'countsOnly',
      joi.boolean().optional(),
      'If "groupBy" is specified, this parameter determines whether to return aggregated event totals' +
      ' (countsOnly=true), or entire event lists per group (countsOnly=false).'
    )
    .queryParam(
      'groupSort',
      joi
        .string()
        .valid('asc', 'desc')
        .optional(),
      'The inner/secondary sort order of records in a group (if "groupBy" is specified and "countsOnly" is falsey),' +
      ' sorted by `event.ctime`. Default: "desc".'
    )
    .queryParam(
      'groupSkip',
      joi
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
      joi
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to keep in each group of the result set (if "groupBy" is specified and "countsOnly" is ' +
      'falsey), starting from "groupSkip"/0. Falsey implies all.'
    )
    .queryParam(
      'returnCommands',
      joi.boolean().optional(),
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
