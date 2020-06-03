'use strict'

const syncOp = require('../operations/commit/sync')

function commit ({ body: { path, types } }) {
  return syncOp(path, types)
}

function commitProvider (path, types = undefined) {
  return commit({ body: { path, types } })
}

module.exports = {
  commit,
  commitProvider
}
