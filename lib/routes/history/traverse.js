'use strict'

const { joiCG } = require('../helpers')
const { traverse } = require('../../handlers/traverseHandlers')
const { DOC_ID_REGEX } = require('../../helpers')

module.exports = router => {
  const bodyDesc =
    'The edge collections to traverse along with their specified directions, and the traverse expression to apply on' +
    ' the traversed nodes.'
  const reqBodySchema = joiCG.object().keys({
    edges: joiCG.object().pattern(/^/, joiCG.string().valid('inbound', 'outbound', 'any')).min(1).required(),
    vFilter: joiCG.string().filter().optional(),
    eFilter: joiCG.string().filter().optional()
  })

  buildEndpoint(router.post('/traverse', processTraverseRequest, 'traversePost'))
    .body(reqBodySchema, `${bodyDesc}  (e.g. \`{
        "edges": {"edge_collection_1: "inbound", "edge_collection_2: "outbound", "edge_collection_3: "any"},
        "vFilter": "x == 2 && y < 1",
        "eFilter": "x == 2 && y < 1"
      }\`)`)
    .summary('traverse historic node states.')

  console.debug('Loaded "traverse" routes')
}

function processTraverseRequest (req, res) {
  res.status(200).json(traverse(req))
}

function buildEndpoint (endpoint) {
  return endpoint
    .queryParam(
      'timestamp',
      joiCG
        .number()
        .precision(5)
        .optional(),
      'The unix timestamp (sec) for which to traverse node states. Precision: 10μs. Example: since=1547560124.43204.' +
      ' Default: Current Time'
    )
    .queryParam(
      'svid',
      joiCG
        .string()
        .regex(DOC_ID_REGEX)
        .required(),
      'The id of the starting vertex from which to begin traversal".'
    )
    .queryParam(
      'depth',
      joiCG
        .number()
        .integer()
        .min(0)
        .optional(),
      'The depth to which the traversal should execute. Default: 1'
    )
    .queryParam(
      'bfs',
      joiCG.boolean().optional(),
      'Determines whether to run a breadth-first traversal. Default: false.'
    )
    .queryParam(
      'uniqueVertices',
      joiCG
        .string()
        .valid('path', 'global', 'none')
        .optional(),
      'Restrict traversal to unique vertices within the specified scope - one of "path", "global" or "none".' +
      ' Default: "none"'
    )
    .queryParam(
      'uniqueEdges',
      joiCG
        .string()
        .valid('path', 'none')
        .optional(),
      'Restrict traversal to unique vertices within the specified scope - one of "path" or "none". Default: "path"'
    )
    .response(200, ['application/json'], 'The historic node states were successfully traversed and filtered.')
    .error(500, 'The operation failed.')
    .description(
      'Returns a traversal over past states for nodes matching the given filters.'
    )
    .tag('History')
}
