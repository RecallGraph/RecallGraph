'use strict'

const kspOp = require('../operations/k_shortest_paths')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { DOC_ID_REGEX } = require('../constants')
const { KSP_BODY_SCHEMA } = require('../routes/schemas')
const { omit } = require('lodash')

const intSchema = JoiRG.number().integer()
const docIDSchema = JoiRG.string().regex(DOC_ID_REGEX).required()
const providerSchemas = [
  JoiRG.number(), docIDSchema, docIDSchema, intSchema.min(1), intSchema.min(0), intSchema.min(1), KSP_BODY_SCHEMA
]

function kShortestPaths (req) {
  const { edges, vFilter, eFilter, weightExpr } = req.body
  const { timestamp, svid, evid, depth, skip, limit } = req.queryParams

  return kspOp(timestamp, svid, evid, depth, edges, skip, limit, { vFilter, eFilter, weightExpr })
}

function kspProvider (timestamp, svid, evid, depth, edges, skip = 0, limit = 1,
  { vFilter, eFilter, weightExpr } = {}) {
  const result = validate([timestamp, svid, evid, depth, skip, limit, { edges, vFilter, eFilter, weightExpr }],
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
