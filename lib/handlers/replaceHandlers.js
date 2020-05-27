'use strict'

const commit = require('../operations/commit')
const { DB_OPS: { REPLACE } } = require('../constants')

const { pick, omit, isObject } = require('lodash')

const shallowOptKeys = ['returnNew', 'returnOld', 'silent']

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

module.exports = {
  replaceSingle,
  replaceMultiple
}
