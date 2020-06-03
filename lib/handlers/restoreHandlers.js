'use strict'

const restoreOp = require('../operations/restore')

function restore ({ body: { path }, queryParams }) {
  return restoreOp(path, queryParams)
}

function restoreProvider (path, options = {}) {
  return restore({ body: path, queryParams: options })
}

module.exports = {
  restore,
  restoreProvider
}
