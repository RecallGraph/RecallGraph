'use strict'

const { getComponentTagOption } = require('../../helpers')
const { utils: { attachSpan } } = require('@recallgraph/foxx-tracer')
const { getScopeAndSearchPatternFor, getScopeFilters, SYNC_MAP } = require('./helpers')
const { SYNC_TYPES: { EXISTING, DELETED } } = require('../../constants')

const cto = getComponentTagOption(__filename)

function sync (path = '/', types = [EXISTING, DELETED]) {
  const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
  const result = {
    updated: 0,
    restored: 0,
    created: 0,
    deleted: 0
  }

  for (const collection of scope.collections(searchPattern)) {
    const scopeFilters = getScopeFilters(scope, searchPattern, collection)

    for (const t of types) {
      const filter = scopeFilters[t]
      const ops = SYNC_MAP[t]
      const cursor = ops.get(collection, filter)
      const opsResult = ops.proc(cursor)

      for (const key in opsResult) {
        result[key] += opsResult[key]
      }
    }
  }

  return result
}

module.exports = attachSpan(sync, 'sync', cto)
