'use strict'

const joi = require('joi')
const { filter } = require('../../handlers/filterHandlers')
const { pathSchema } = require('../helpers')
// const { jsep } = require('../../operations/filter/helpers')

module.exports = router => {
  const bodyDesc =
    'The path pattern to pick nodes whose states should be returned, and the filter expression to apply on them.'
  const reqBodySchema = joi.object().keys({
    path: pathSchema,
    filter: joi.string().required()
    //   .custom(value => {
    //   try {
    //     jsep(value)
    //
    //     return value
    //   } catch (e) {
    //     throw new Error('"filter" must be a valid filter expression (see docs).')
    //   }
    // }, 'ensure valid filter expression')
  })

  buildEndpoint(router.post('/filter', processfilterRequest, 'filterPost'))
    .body(reqBodySchema, `${bodyDesc}  (e.g. \`{"path": "/c/*raw_data*", "filter": "x == 2 && y < 1"}\`)`)
    .summary('Filter node states.')

  console.debug('Loaded "filter" routes')
}

function processfilterRequest (req, res) {
  res.status(200).json(filter(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam(
      'timestamp',
      joi
        .number()
        .precision(5)
        .optional(),
      'The unix timestamp (sec) for which to filter node states. Precision: 10μs. Example: since=1547560124.43204'
    )
    .queryParam(
      'sort',
      joi
        .string()
        .valid('asc', 'desc')
        .optional(),
      'The sort order of records in the result set. Sorts by node ID in the given the sort direction. Default: "asc".'
    )
    .queryParam(
      'preSkip',
      joi
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to skip/omit from the intermediate result set (after path match, before filter), starting' +
      ' from the first. Falsey implies none.'
    )
    .queryParam(
      'preLimit',
      joi
        .number()
        .integer()
        .min(0)
        .optional(),
      'The number records to keep in the intermediate result set (after path match, before filter), starting from' +
      ' "skip"/0. Falsey implies all.'
    )
    .response(200, ['application/json'], 'The states were successfully generated and filtered.')
    .error(500, 'The operation failed.')
    .description(
      'Returns past states for nodes matching the given path pattern and the sorting/slicing constraints and filters.'
    )
    .tag('History')
}
