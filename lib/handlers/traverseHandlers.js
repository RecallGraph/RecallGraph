'use strict'

const traverseOp = require('../operations/traverse')
const { omit } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { DOC_ID_REGEX } = require('../constants')
const { TRAVERSE_BODY_SCHEMA } = require('../routes/schemas')

const intSchema = JoiRG.number().integer()
const docIDSchema = JoiRG.string().regex(DOC_ID_REGEX).required()
const optionsSchema = TRAVERSE_BODY_SCHEMA.concat(JoiRG.object().keys({
  bfs: JoiRG.boolean(),
  uniqueVertices: JoiRG.string().valid('path', 'global', 'none'),
  uniqueEdges: JoiRG.string().valid('path', 'none'),
  returnVertices: JoiRG.boolean(),
  returnEdges: JoiRG.boolean(),
  returnPaths: JoiRG.boolean()
}))
const providerSchemas = [
  JoiRG.number(), docIDSchema, intSchema.min(0), intSchema.min(0), optionsSchema
]

function traverse (req) {
  const options = omit(req.queryParams, 'timestamp', 'svid', 'minDepth', 'maxDepth')
  const { edges: edgeCollections, vFilter, eFilter, pFilter } = req.body
  const { timestamp, svid, minDepth, maxDepth } = req.queryParams

  return traverseOp(timestamp, svid, minDepth, maxDepth, edgeCollections,
    Object.assign({ vFilter, eFilter, pFilter }, options))
}

/*
 * ### traverseProvider
 * Returns a traversal over past states for nodes matching the given filters.
 *
 * **Args:**
 * - `timestamp` - The unix timestamp (sec) for which to traverse node states. Precision: 0.1μs.
 *    Example: timestamp=1581583228.2800217. Default: Current Time.
 * - `svid` - The id of the starting vertex from which to begin traversal.
 * - `minDepth` - The minimum depth from which to emit vertices, edges and paths.
 * - `maxDepth` - The maximum depth till which the traversal should execute.
 * - `edges` - The edge collections to traverse along with their specified directions.
 * - `options` - An optional object, containing any combination of the following keys:
 *    - `uniqueVertices` - Restrict traversal to unique vertices within the specified scope - one of `path`,
 *    `global` or `none`. Default: `none`.
 *    - `uniqueEdges` - Restrict traversal to unique vertices within the specified scope - one of `path` or
 *    `none`. Default: `path`.
 *    - `bfs` - Determines whether to run a breadth-first traversal. Default: `true` if `uniqueVertices` is `
 *    global`, `false` otherwise. It is also internally **forced** to `true` when `uniqueVertices` is `global`.
 *    - `vFilter` - The filter expression to apply on the traversed vertices.
 *    - `eFilter` - The filter expression to apply on the traversed edges.
 *    - `pFilter` - The filter expression to apply on the traversed paths.
 *    - `returnVertices` - Whether to return the vertices visited during the traversal
 *    (at depth >= `minDepth`). Visit order is maintained. Default `true`.
 *    - `returnEdges` - Whether to return the edges visited during the traversal (at depth >= `minDepth`).
 *    Visit order is maintained. Default `true`.
 *    - `returnPaths` - Whether to return the paths traversed. Traverse order is maintained. Default `true`.
 *
 *
 * **Return:**
 *
 * The contents of the result returned by the method is identical to the contents of the response
 * body of the corresponding
 * [HTTP API](https://app.swaggerhub.com/apis-docs/RecallGraph/RecallGraph/1.0.0#/History/traversePost),
 * invoked with identical input, except when the method throws an error.
 * In the latter case, the error message would be identical to the error response of the HTTP call.
 *
 *
 * **Errors:**
 *
 * Any error that occurs while executing the method is thrown back to the caller.
 *
 *
 * **Examples:**
 * 1. Default options:
 *   ```
 *   traverseProvider(1581583228.2800217, '/vertex_collection/1',
 *     3, 5,
 *     {
 *       "edge_collection_1": "inbound",
 *       "edge_collection_2": "outbound",
 *       "edge_collection_3": "any"
 *     }
 *   )
 *   ```
 * 1. Return results from depth 3 to 5 (both inclusive) and apply filters:
 *   ```
 *   traverseProvider(1581583228.2800217, '/vertex_collection/1',
 *     3, 5
 *     {
 *       "edge_collection_1": "inbound",
 *       "edge_collection_2": "outbound",
 *       "edge_collection_3": "any"
 *     },
 *     {
 *       "vFilter": "x == 2 && y < 1",
 *       "eFilter": "x == 2 && y < 1",
 *       "pFilter": "edges[0].x > 2 && vertices[1].y < y"
 *     }
 *   )
 *   ```
 */
function traverseProvider (timestamp, svid, minDepth, maxDepth, edges, options = {}) {
  const result = validate([timestamp, svid, minDepth, maxDepth, Object.assign({ edges }, options)],
    providerSchemas)
  checkValidation(result)

  const args = result.values
  timestamp = args[0]
  svid = args[1]
  minDepth = args[2]
  maxDepth = args[3]
  edges = args[4].edges
  options = omit(args[4], 'edges')

  return traverseOp(timestamp, svid, minDepth, maxDepth, edges, options)
}

module.exports = {
  traverse,
  traverseProvider
}
