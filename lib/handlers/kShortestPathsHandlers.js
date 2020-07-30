'use strict'

const kspOp = require('../operations/k_shortest_paths')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { DOC_ID_REGEX } = require('../constants')
const { KSP_BODY_SCHEMA } = require('../routes/schemas')
const { omit } = require('lodash')

const intSchema = JoiRG.number().integer()
const docIDSchema = JoiRG.string().regex(DOC_ID_REGEX).required()
const providerSchemas = [
  JoiRG.number(), docIDSchema, docIDSchema, intSchema.min(1), intSchema.min(0),
  intSchema.min(1), KSP_BODY_SCHEMA
]

function kShortestPaths (req) {
  const { edges, vFilter, eFilter, weightExpr } = req.body
  const { timestamp, svid, evid, depth, skip, limit } = req.queryParams

  return kspOp(timestamp, svid, evid, depth, edges, skip, limit, { vFilter, eFilter, weightExpr })
}

/*
 * ### kspProvider
 * Returns k shortest historic paths between vertices, matching the given filters.
 *
 * **Args:**
 * - `timestamp` - The unix timestamp (sec) for which to traverse node states. Precision: 0.1μs.
 *    Example: since=1581583228.2800217. Default: Current Time
 * - `svid` - The id of the starting vertex from which to begin traversal.
 * - `evid` - The id of the ending vertex at which to end traversal.
 * - `depth` - The max depth to which the traversal should execute. Default: `1`.
 * - `edges` - The edge collections to traverse along with their specified directions.
 * - `skip` - The number of paths to skip. Default: `0`.
 * - `limit` - The max number of shortest paths to return. Default: `1`.
 * - `options` - An optional object, containing any combination of the following keys:
 *    - `vFilter` - The filter expressions to apply on the traversed vertices.
 *    - `eFilter` - The filter expressions to apply on the traversed edges.
 *    - `weightExpr` - The weight expression to evaluate cost per edge. Default `1`.
 *
 *
 * **Return:**
 *
 * The contents of the result returned by the method is identical to the contents of the response
 * body of the corresponding
 * [HTTP API](https://app.swaggerhub.com/apis-docs/RecallGraph/RecallGraph/1.0.0#/History/kShortestPathsPost),
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
 *   kspProvider(1581583228.2800217, '/vertex_collection/1',
 *     '/vertex_collection/10', 3,
 *     {
 *       "edge_collection_1": "inbound",
 *       "edge_collection_2": "outbound",
 *       "edge_collection_3": "any"
 *     }
 *   )
 *   ```
 * 1. Skip the 1st path and return the next 2, using a weight expression of
 * 'price + service charge + 18% service tax':
 *   ```
 *   kspProvider(1581583228.2800217, '/vertex_collection/1',
 *     '/vertex_collection/10', 3,
 *     {
 *       "edge_collection_1": "inbound",
 *       "edge_collection_2": "outbound",
 *       "edge_collection_3": "any"
 *     },
 *     1, 2,
 *     { weightExpr: "price + service_charge * 1.18" }
 *   )
 *   ```
 */
function kspProvider (timestamp, svid, evid, depth, edges, skip = 0, limit = 1,
  { vFilter, eFilter, weightExpr } = {}) {
  const result = validate([
    timestamp, svid, evid, depth, skip, limit,
    { edges, vFilter, eFilter, weightExpr }
  ],
  providerSchemas)
  checkValidation(result)

  const args = result.values
  timestamp = args[0]
  svid = args[1]
  evid = args[2]
  depth = args[3]
  edges = args[6].edges
  skip = args[4]
  limit = args[5]
  const options = omit(args[6], 'edges')

  return kspOp(timestamp, svid, evid, depth, edges, skip, limit, options)
}

module.exports = {
  kShortestPaths,
  kspProvider
}
