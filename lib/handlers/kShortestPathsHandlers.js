'use strict'

const kspOp = require('../operations/k_shortest_paths')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { DOC_ID_REGEX } = require('../constants')
const { KSP_REQ_BODY_SCHEMA } = require('../routes/constants')

const intSchema = JoiRG.number().integer()
const docIDSchema = JoiRG.string().regex(DOC_ID_REGEX).required()
const providerSchemas = [
  JoiRG.number(), docIDSchema, docIDSchema, intSchema.min(1), intSchema.min(0), intSchema.min(1), KSP_REQ_BODY_SCHEMA
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

  return kspOp(timestamp, svid, evid, depth, edges, skip, limit, { vFilter, eFilter, weightExpr })
}

module.exports = {
  kShortestPaths,
  kspProvider
}
