'use strict'

const { joiCG } = require('../helpers')
const { diff } = require('../../handlers/diffHandlers')
const { pathSchema } = require('../helpers')

module.exports = router => {
  const bodyDesc =
    'The path pattern to pick nodes whose diffs should be returned, and the optional post-filter expression to' +
    ' apply on them.'
  const filterSchema = joiCG.string().filter()
  const reqBodySchema = joiCG.object().keys({
    path: pathSchema,
    postFilter: filterSchema.required()
  })
    .optionalKeys('postFilter')

  buildEndpoint(router.get('/diff', processDiffRequest, 'diffGet'))
    .queryParam('path', pathSchema, 'The path pattern to pick nodes whose diffs should be returned.')
    .queryParam('postFilter', filterSchema.optional(), 'The optional post-filter expression to apply on the diffs.')
    .summary('Get diffs (path & postFilter param in query).')

  buildEndpoint(router.post('/diff', processDiffRequest, 'diffPost'))
    .body(reqBodySchema, `${bodyDesc}  (e.g. \`{"path": "/c/*raw_data*", "postFilter": "x == 2 && y < 1"}\`)`)
    .summary('Get diffs (path & postFilter param in body).')

  console.debug('Loaded "diff" routes')
}

function processDiffRequest (req, res) {
  res.status(200).json(diff(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam(
      'since',
      joiCG
        .number()
        .precision(5)
        .optional(),
      'The unix timestamp (sec) for the earliest matching event from which to start fetching diffs. Precision: 0.1μs.' +
      ' Example: since=1581583228.2800217'
    )
    .queryParam(
      'until',
      joiCG
        .number()
        .precision(5)
        .optional(),
      'The unix timestamp (sec) for the latest matching event until which to keep fetching diffs. Precision: 0.1μs.' +
      ' Example: until=1581583228.2800217'
    )
    .queryParam(
      'sort',
      joiCG
        .string()
        .valid('asc', 'desc')
        .optional(),
      'The primary sort order of records in the result set, sorted by node ID. Default: "asc".'
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
      'reverse',
      joiCG
        .boolean()
        .optional(),
      'Whether to invert the individual diffs, so that they can be applied in reverse order. This also reverses the' +
      ' order of diffs within a node.'
    )
    .response(200, ['application/json'], 'The diff was successfully generated.')
    .error(500, 'The operation failed.')
    .description(
      'Returns diffs for nodes matching the given path pattern and the sorting/slicing constraints.'
    )
    .tag('Event')
}
