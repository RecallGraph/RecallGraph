'use strict'

const { db, aql } = require('@arangodb')
const { getSortingClause, getGroupingClause, getReturnClause } = require('./helpers')
const { getLimitClause, getEventLogQueryInitializer, filter } = require('../helpers')
const { utils: { attachSpan, startSpan } } = require('foxx-tracing')

const logFn = function log (
  path = '/',
  {
    since, until, sort = 'desc', skip, limit, groupBy, countsOnly, groupSort = 'desc', groupSkip, groupLimit,
    returnCommands, postFilter
  } = {}
) {
  const queryParts = getEventLogQueryInitializer(path, since, until)

  queryParts.push(getGroupingClause(groupBy, countsOnly, returnCommands))
  queryParts.push(getSortingClause(sort, groupBy, countsOnly))
  queryParts.push(getLimitClause(limit, skip))
  queryParts.push(getReturnClause(groupBy, countsOnly, groupSort, groupSkip, groupLimit, returnCommands))

  const query = aql.join(queryParts, '\n')

  const querySpan = startSpan('module/operations/log/query')
  const cursor = db._query(query)
  querySpan.log(cursor.getExtra())
  querySpan.finish()

  const dbResults = cursor.toArray()
  cursor.dispose()

  return postFilter ? filter(dbResults, postFilter) : dbResults
}

module.exports = attachSpan(logFn, 'module/operations/log')
