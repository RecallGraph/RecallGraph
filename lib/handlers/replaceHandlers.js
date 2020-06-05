'use strict'

const commit = require('../operations/commit')
const { DB_OPS: { REPLACE } } = require('../constants')
const { pick, omit, isObject } = require('lodash')
const { JoiRG, validate, checkValidation } = require('../routes/helpers')
const { UPDATE_BODY_SCHEMA } = require('../routes/constants')

const shallowOptKeys = ['returnNew', 'returnOld', 'silent']
const optionsSchema = JoiRG.object().keys({
  returnNew: JoiRG.boolean(),
  returnOld: JoiRG.boolean(),
  silent: JoiRG.boolean(),
  ignoreRevs: JoiRG.boolean()
})
const providerSchemas = [JoiRG.string().collection().required(), UPDATE_BODY_SCHEMA, optionsSchema]

function replaceSingle ({ pathParams, body }, options, deepOpts) {
  let shallowOpts
  if (!isObject(deepOpts)) {
    shallowOpts = pick(options, shallowOptKeys)
    deepOpts = omit(options, shallowOptKeys)
  } else {
    shallowOpts = options
  }

  return commit(
    pathParams.collection,
    body,
    REPLACE,
    shallowOpts,
    deepOpts
  )
}

function replaceMultiple ({ pathParams, body }, options) {
  const shallowOpts = pick(options, shallowOptKeys)
  const deepOpts = omit(options, shallowOptKeys)
  const nodes = []

  body.forEach(node => {
    try {
      nodes.push(
        replaceSingle({ pathParams, body: node }, shallowOpts, deepOpts)
      )
    } catch (e) {
      console.error(e.stack)
      nodes.push(e)
    }
  })

  return nodes
}

function replaceProvider (collection, data, options = {}) {
  const result = validate([collection, data, options], providerSchemas)
  checkValidation(result)

  const req = {
    pathParams: collection,
    body: data
  }

  if (Array.isArray(data)) {
    return replaceMultiple(req, options)
  } else {
    const shallowOpts = pick(options, shallowOptKeys)
    const deepOpts = omit(options, shallowOptKeys)

    return replaceSingle(req, shallowOpts, deepOpts)
  }
}

module.exports = {
  replaceSingle,
  replaceMultiple,
  replaceProvider
}
