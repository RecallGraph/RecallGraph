'use strict'

const commit = require('../operations/commit')
const { DB_OPS: { INSERT } } = require('../constants')

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

module.exports = {
  createSingle,
  createMultiple
}
