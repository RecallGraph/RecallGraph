'use strict'

const { aql } = require('@arangodb')
const { getSortingClause, getGroupingClause, getReturnClause } = require('./helpers')
const { getLimitClause, filter, getEventLogQueryInitializer } = require('../helpers')
const { utils: { attachSpan, instrumentedQuery } } = require('@recallgraph/foxx-tracer')
const { getComponentTagOption } = require('../../helpers')

const cto = getComponentTagOption(__filename)

function log (
  path = '/',
  {
    since, until, sort = 'desc', skip, limit, groupBy, countsOnly, groupSort = 'desc', groupSkip,
    groupLimit, postFilter
  } = {}
) {
  const queryParts = getEventLogQueryInitializer(path, since, until)

  queryParts.push(getGroupingClause(groupBy, countsOnly))
  queryParts.push(getSortingClause(sort, groupBy, countsOnly))
  queryParts.push(getLimitClause(limit, skip))
  queryParts.push(getReturnClause(groupBy, countsOnly, groupSort, groupSkip, groupLimit))

  const query = aql.join(queryParts, '\n')
  const dbResults = instrumentedQuery(query, 'logQuery', cto).toArray()

  return postFilter ? filter(dbResults, postFilter) : dbResults
}

module.exports = attachSpan(log, 'log', cto)
