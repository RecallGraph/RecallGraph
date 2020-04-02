'use strict'

const { db, aql } = require('@arangodb')
const { getSortingClause, getGroupingClause, getReturnClause } = require('./helpers')
const { getLimitClause, getEventLogQueryInitializer, filter } = require('../helpers')
const { startSpan, endSpan } = require('../../helpers')
const { omitBy, isNil } = require('lodash')

module.exports = function log (
  path = '/',
  {
    since, until, sort = 'desc', skip, limit, groupBy, countsOnly, groupSort = 'desc', groupSkip, groupLimit,
    returnCommands, postFilter
  } = {}
) {
  const span = startSpan('module/operations/log', {
    tags: {
      args: omitBy({
        path,
        since,
        until,
        sort,
        skip,
        limit,
        groupBy,
        countsOnly,
        groupSort,
        groupSkip,
        groupLimit,
        returnCommands,
        postFilter
      }, isNil)
    }
  })

  const queryParts = getEventLogQueryInitializer(path, since, until)

  queryParts.push(getGroupingClause(groupBy, countsOnly, returnCommands))
  queryParts.push(getSortingClause(sort, groupBy, countsOnly))
  queryParts.push(getLimitClause(limit, skip))
  queryParts.push(getReturnClause(groupBy, countsOnly, groupSort, groupSkip, groupLimit, returnCommands))

  const query = aql.join(queryParts, '\n')

  const span2 = startSpan('module/operations/log/query', {
    tags: {
      args: omitBy({
        path,
        since,
        until,
        sort,
        skip,
        limit,
        groupBy,
        countsOnly,
        groupSort,
        groupSkip,
        groupLimit,
        returnCommands
      }, isNil)
    }
  })
  const cursor = db._query(query)
  span2.log(cursor.getExtra())
  endSpan(span2)

  const dbResults = cursor.toArray()
  cursor.dispose()
  const result = postFilter ? filter(dbResults, postFilter) : dbResults

  endSpan(span)

  return result
}
