'use strict'

const { joiCG } = require('../helpers')
const { traverse } = require('../../handlers/traverseHandlers')
const { DOC_ID_REGEX } = require('../../helpers')
const dd = require('dedent')

module.exports = router => {
  const reqBodySchema = joiCG.object().keys({
    edges: joiCG.object().pattern(/^/, joiCG.string().valid('inbound', 'outbound', 'any')).min(1).required(),
    vFilter: joiCG.string().filter().required(),
    eFilter: joiCG.string().filter().required()
  }).optionalKeys('vFilter', 'eFilter')

  buildEndpoint(router.post('/traverse', processTraverseRequest, 'traversePost'))
    .body(reqBodySchema, dd`
      The edge collections to traverse along with their specified directions, and the filter expressions to apply on the
      traversed vertices and edges.
      (e.g. \`{
        "edges": { "edge_collection_1": "inbound", "edge_collection_2": "outbound", "edge_collection_3": "any" },
        "vFilter": "x == 2 && y < 1",
        "eFilter": "x == 2 && y < 1"
      }\`)
    `)

    .summary('Traverse historic node states.')

  console.debug('Loaded "traverse" routes')
}

function processTraverseRequest (req, res) {
  res.status(200).json(traverse(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam('timestamp', joiCG.number().precision(5).optional(), dd`
      The unix timestamp (sec) for which to traverse node states. Precision: 0.1μs. Example: since=1581583228.2800217.
      Default: Current Time
    `)

    .queryParam('svid', joiCG.string().regex(DOC_ID_REGEX).required(),
      'The id of the starting vertex from which to begin traversal".')

    .queryParam('depth', joiCG.number().integer().min(1).optional(),
      'The max depth to which the traversal should execute. Default: `1`')

    .queryParam('bfs', joiCG.boolean().optional(),
      'Determines whether to run a breadth-first traversal. Default: `false`.')

    .queryParam('uniqueVertices', joiCG.string().valid('path', 'global', 'none').optional(), dd`
      Restrict traversal to unique vertices within the specified scope - one of \`path\`, \`global\` or \`none\`.
      Default: \`none\`
    `)

    .queryParam('uniqueEdges', joiCG.string().valid('path', 'none').optional(),
      'Restrict traversal to unique vertices within the specified scope - one of `path` or `none`. Default: `path`')

    .response(200, ['application/json'], 'The historic node states were successfully traversed and filtered.')
    .error(500, 'The operation failed.')

    .description(dd`
      Returns a traversal over past states for nodes matching the given filters.
      
      Also see: https://docs.recallgraph.tech/getting-started/terminology/post-filters
    `)

    .tag('History')
}
