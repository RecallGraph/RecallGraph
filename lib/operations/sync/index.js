'use strict'

const { getComponentTagOption } = require('../../helpers')
const { utils: { attachSpan } } = require('foxx-tracing')
const {
  SYNC_TYPES: { EXISTING, DELETED }, getScopeAndSearchPatternFor, getScopeFilters, SYNC_MAP
} = require('./helpers')

const cto = getComponentTagOption(__filename)

function sync (path = '/', types = [EXISTING, DELETED]) {
  const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
  const result = {}

  for (const collection of scope.collections(searchPattern)) {
    const scopeFilters = getScopeFilters(scope, searchPattern, collection)

    for (const t of types) {
      const filter = scopeFilters[t]
      const ops = SYNC_MAP[t]
      const cursor = ops.get(collection, filter)

      Object.assign(result, ops.proc(cursor))
    }
  }

  return result
}

module.exports = attachSpan(sync, 'sync', cto)
