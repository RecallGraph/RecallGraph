'use strict'

const traverseOp = require('../operations/traverse')
const { omit } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { DOC_ID_REGEX } = require('../constants')
const { TRAVERSE_BODY_SCHEMA } = require('../routes/constants')

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

function traverseProvider (timestamp, svid, minDepth, maxDepth, edges, options = {}) {
  const result = validate([timestamp, svid, minDepth, maxDepth, Object.assign({ edges }, options)],
    providerSchemas)
  checkValidation(result)

  return traverseOp(timestamp, svid, minDepth, maxDepth, edges, options)
}

module.exports = {
  traverse,
  traverseProvider
}
