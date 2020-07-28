'use strict'

const commit = require('../operations/commit')
const { DB_OPS: { INSERT } } = require('../constants')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { CREATE_BODY_SCHEMA } = require('../routes/schemas')

const optionsSchema = JoiRG.object().keys({
  returnNew: JoiRG.boolean(),
  silent: JoiRG.boolean()
})
const providerSchemas = [JoiRG.string().collection().required(), CREATE_BODY_SCHEMA, optionsSchema]

function createSingle ({ pathParams, body }, options) {
  return commit(pathParams.collection, body, INSERT, options)
}

function createMultiple ({ pathParams, body }, options) {
  const nodes = []
  body.forEach(node => {
    try {
      nodes.push(createSingle({ pathParams, body: node }, options))
    } catch (e) {
      console.error(e.stack)
      nodes.push(e)
    }
  })

  return nodes
}

function createProvider (collection, data, options = {}) {
  const result = validate([collection, data, options], providerSchemas)
  checkValidation(result)

  const args = result.values
  collection = args[0]
  data = args[1]
  options = args[2]

  const req = {
    pathParams: { collection },
    body: data
  }

  if (Array.isArray(data)) {
    return createMultiple(req, options)
  } else {
    return createSingle(req, options)
  }
}

module.exports = {
  createSingle,
  createMultiple,
  createProvider
}
