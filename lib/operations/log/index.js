'use strict'

const { aql } = require('@arangodb')
const { getSortingClause, getGroupingClause, getReturnClause } = require('./helpers')
const { getLimitClause, getEventLogQueryInitializer, filter } = require('../helpers')
const { utils: { attachSpan, instrumentedQuery } } = require('foxx-tracing')
const { getComponentTagOption } = require('../../helpers')

const cto = getComponentTagOption(__filename)

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
  const dbResults = instrumentedQuery(query, 'logQuery', cto)

  return postFilter ? filter(dbResults, postFilter) : dbResults
}

module.exports = attachSpan(logFn, 'log', cto)
