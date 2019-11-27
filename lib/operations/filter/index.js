'use strict'

const show = require('../show')
const { filter: filterNodes } = require('./helpers')

module.exports = function filter (path = '/', timestamp, filterExpr, { sort, preSkip, preLimit } = {}) {
  const unFilteredNodes = show(path, timestamp, { sort, skip: preSkip, limit: preLimit })

  return filterNodes(unFilteredNodes, filterExpr)
}
