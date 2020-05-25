'use strict'

const syncOp = require('../operations/sync')

function sync ({ body: { path, types } }) {
  return syncOp(path, types)
}

module.exports = {
  sync
}
