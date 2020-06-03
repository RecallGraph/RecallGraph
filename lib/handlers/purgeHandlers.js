'use strict'

const purgeOp = require('../operations/purge')

function purge (req) {
  return purgeOp(req.body.path, req.queryParams)
}

function purgeProvider (path, options = {}) {
  return purge({ body: path, queryParams: options })
}

module.exports = {
  purge,
  purgeProvider
}
