'use strict'

const { db, aql } = require('@arangodb')
const {
  SERVICE_GRAPHS,
  TRANSIENT_EVENT_SUPERNODE,
  SERVICE_COLLECTIONS
} = require('../../helpers')
const {
  getScopeFilters,
  getLimitClause,
  getSortingClause,
  getGroupingClause,
  getScopeFor,
  getSearchPattern,
  getScopeInitializers,
  getReturnClause,
  getTimeBoundFilters
} = require('./helpers')

module.exports = function log (
  path = '/',
  { since, until, sort, skip, limit, groupBy, countsOnly, groupSort, groupSkip, groupLimit, returnCommands } = {}
) {
  const scope = getScopeFor(path)
  const searchPattern = getSearchPattern(scope, path)

  const queryParts = [
    getScopeInitializers(scope, searchPattern),
    aql`
      for v, e, p in 2..${Number.MAX_SAFE_INTEGER}
      outbound ${TRANSIENT_EVENT_SUPERNODE._id}
      graph ${SERVICE_GRAPHS.eventLog}
      filter is_same_collection(${SERVICE_COLLECTIONS.events}, v)
    `,
    getScopeFilters(scope, searchPattern)
  ]

  const timeBoundFilters = getTimeBoundFilters(since, until)
  timeBoundFilters.forEach(filter => queryParts.push(filter))

  queryParts.push(getGroupingClause(groupBy, countsOnly, returnCommands))
  queryParts.push(getSortingClause(sort, groupBy, countsOnly))
  queryParts.push(getLimitClause(limit, skip))
  queryParts.push(getReturnClause(groupBy, countsOnly, groupSort, groupSkip, groupLimit, returnCommands))

  const query = aql.join(queryParts, '\n')

  return db._query(query).toArray()
}
