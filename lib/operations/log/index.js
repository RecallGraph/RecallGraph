'use strict'

const { db, aql } = require('@arangodb')
const {
  getSortingClause,
  getGroupingClause,
  getReturnClause
} = require('./helpers')
const {
  getLimitClause,
  getScopeFor,
  getSearchPattern,
  getEventLogQueryInitializer
} = require('../helpers')

module.exports = function log (
  path = '/',
  { since, until, skip, limit, sortType, groupBy, countsOnly } = {}
) {
  const scope = getScopeFor(path)
  const searchPattern = getSearchPattern(scope, path)
  const queryParts = getEventLogQueryInitializer(scope, searchPattern, since, until)

  queryParts.push(getGroupingClause(groupBy, countsOnly))
  queryParts.push(getSortingClause(sortType, groupBy, countsOnly))
  queryParts.push(getLimitClause(limit, skip))
  queryParts.push(getReturnClause(sortType, groupBy, countsOnly))

  const query = aql.join(queryParts, '\n')

  return db._query(query).toArray()
}
