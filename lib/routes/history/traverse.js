'use strict'

const { joiCG } = require('../helpers')
const { traverse } = require('../../handlers/traverseHandlers')
const { DOC_ID_REGEX } = require('../../helpers')
const dd = require('dedent')

module.exports = router => {
  const reqBodySchema = joiCG.object().keys({
    edges: joiCG.object().pattern(/^/, joiCG.string().valid('inbound', 'outbound', 'any')).min(1).required(),
    vFilter: joiCG.string().filter().required(),
    eFilter: joiCG.string().filter().required(),
    pFilter: joiCG.string().filter().required()
  }).optionalKeys('vFilter', 'eFilter', 'pFilter')

  buildEndpoint(router.post('/traverse', processTraverseRequest, 'traversePost'))
    .body(reqBodySchema, dd`
      The edge collections to traverse along with their specified directions, and the filter expressions to apply on the
      traversed vertices, edges and path. \`vFilter\`, \`eFilter\` and \`pFilter\` are applied to every visited vertex,
      edge and traversed path (respectively), once the traversed depth is >= \`minDepth\`. 
      (e.g. \`{
        "edges": { "edge_collection_1": "inbound", "edge_collection_2": "outbound", "edge_collection_3": "any" },
        "vFilter": "x == 2 && y < 1",
        "eFilter": "x == 2 && y < 1",
        "pFilter": "edges[0].x > 2 && vertices[1].y < y"
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
    .queryParam('timestamp', joiCG.number().optional(), dd`
      The unix timestamp (sec) for which to traverse node states. Precision: 0.1μs. Example: since=1581583228.2800217.
      Default: Current Time
    `)

    .queryParam('svid', joiCG.string().regex(DOC_ID_REGEX).required(),
      'The id of the starting vertex from which to begin traversal".')

    .queryParam('minDepth', joiCG.number().integer().min(0).optional(),
      'The minimum depth from which to emit vertices, edges and paths. Default: `0`')

    .queryParam('maxDepth', joiCG.number().integer().min(0).optional(),
      'The maximum depth till which the traversal should execute. Default: `0`')

    .queryParam('bfs', joiCG.boolean().optional(), dd`
      Determines whether to run a breadth-first traversal. Default: \`true\` if \`uniqueVertices\` is \`global\`,
      \`false\` otherwise. It is also internally **forced** to \`true\` when \`uniqueVertices\` is \`global\`.
    `)

    .queryParam('uniqueVertices', joiCG.string().valid('path', 'global', 'none').optional(), dd`
      Restrict traversal to unique vertices within the specified scope - one of \`path\`, \`global\` or \`none\`.
      Default: \`none\`
    `)

    .queryParam('uniqueEdges', joiCG.string().valid('path', 'none').optional(),
      'Restrict traversal to unique vertices within the specified scope - one of `path` or `none`. Default: `path`')

    .queryParam('returnVertices', joiCG.boolean().optional(), dd`
      Whether to return the vertices visited during the traversal (at depth >= \`minDepth\`). Visit order is maintained.
      Default \`true\`.
    `)

    .queryParam('returnEdges', joiCG.boolean().optional(), dd`
      Whether to return the edges visited during the traversal (at depth >= \`minDepth\`). Visit order is maintained.
      Default \`true\`.
    `)

    .queryParam('returnPaths', joiCG.boolean().optional(),
      'Whether to return the paths traversed. Traverse order is maintained. Default `true`.')

    .response(200, ['application/json'], 'The historic node states were successfully traversed and filtered.')
    .error(500, 'The operation failed.')

    .description(dd`
      Returns a traversal over past states for nodes matching the given filters.

      Also see: https://docs.recallgraph.tech/getting-started/terminology/post-filters
    `)

    .tag('History')
}
