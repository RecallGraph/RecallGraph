'use strict'

const purgeOp = require('../operations/purge')

function purge (req) {
  return purgeOp(req.body.path, req.queryParams)
}

module.exports = {
  purge
}
