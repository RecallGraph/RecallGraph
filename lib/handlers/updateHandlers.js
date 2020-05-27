'use strict'

const commit = require('../operations/commit')
const { DB_OPS: { UPDATE } } = require('../constants')

const { pick, omit, isObject } = require('lodash')

const shallowOptKeys = ['returnNew', 'returnOld', 'silent']

function updateSingle ({ pathParams, body }, options, deepOpts) {
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
    UPDATE,
    shallowOpts,
    deepOpts
  )
}

function updateMultiple ({ pathParams, body }, options) {
  const shallowOpts = pick(options, shallowOptKeys)
  const deepOpts = omit(options, shallowOptKeys)
  const nodes = []

  body.forEach(node => {
    try {
      nodes.push(
        updateSingle({ pathParams, body: node }, shallowOpts, deepOpts)
      )
    } catch (e) {
      console.error(e.stack)
      nodes.push(e)
    }
  })

  return nodes
}

module.exports = {
  updateSingle,
  updateMultiple
}
