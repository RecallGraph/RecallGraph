'use strict'

const syncOp = require('../operations/commit/sync')

function commit ({ body: { path, types } }) {
  return syncOp(path, types)
}

module.exports = {
  commit
}
