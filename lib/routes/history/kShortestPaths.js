'use strict'

const { joiCG } = require('../helpers')
const { kShortestPaths } = require('../../handlers/kShortestPathsHandlers')
const { DOC_ID_REGEX } = require('../../helpers')
const dd = require('dedent')

module.exports = router => {
  const reqBodySchema = joiCG.object().keys({
    edges: joiCG.object().pattern(/^/, joiCG.string().valid('inbound', 'outbound', 'any')).min(1).required(),
    vFilter: joiCG.string().filter().required(),
    eFilter: joiCG.string().filter().required(),
    weightExpr: joiCG.string().filter().required()
  }).optionalKeys('vFilter', 'eFilter', 'weightExpr')

  buildEndpoint(router.post('/kShortestPaths', processKspRequest, 'kShortestPathsPost'))
    .body(reqBodySchema, dd`
      The edge collections to traverse along with their specified directions, the filter expressions to apply on the
      traversed vertices and edges, and the weight expression to evaluate cost per edge.
      (e.g. \`{
        "edges": { "edge_collection_1": "inbound", "edge_collection_2": "outbound", "edge_collection_3": "any" },
        "vFilter": "x == 2 && y < 1",
        "eFilter": "x == 2 && y < 1",
        "weightExpr": "x ** 2 + y ** 2"
      }\`)
    `)

    .summary('k shortest historic paths between vertices.')

  console.debug('Loaded "kShortestPaths" routes')
}

function processKspRequest (req, res) {
  res.status(200).json(kShortestPaths(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam('timestamp', joiCG.number().optional(), dd`
      The unix timestamp (sec) for which to traverse node states. Precision: 0.1μs. Example: since=1581583228.2800217.
      Default: Current Time
    `)

    .queryParam('svid', joiCG.string().regex(DOC_ID_REGEX).required(),
      'The id of the starting vertex from which to begin traversal".')

    .queryParam('evid', joiCG.string().regex(DOC_ID_REGEX).required(),
      'The id of the ending vertex at which to end traversal".')

    .queryParam('depth', joiCG.number().integer().min(1).optional(),
      'The max depth to which the traversal should execute. Default: `1`')

    .queryParam('skip', joiCG.number().integer().min(0).optional(),
      'The number of paths to skip. Default: `0`')

    .queryParam('limit', joiCG.number().integer().min(1).optional(),
      'The max number of shortest paths to return. Default: `1`')

    .response(200, ['application/json'], 'The historic paths were successfully traversed and filtered.')
    .error(500, 'The operation failed.')

    .description(dd`
      Returns k shortest historic paths between vertices, matching the given filters.

      Also see: https://docs.recallgraph.tech/getting-started/terminology/post-filters
    `)

    .tag('History')
}
