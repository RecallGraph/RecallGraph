'use strict'

const restoreOp = require('../operations/restore')

function restore ({ body: { path }, queryParams }) {
  return restoreOp(path, queryParams)
}

module.exports = {
  restore
}
