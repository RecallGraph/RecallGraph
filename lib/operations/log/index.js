'use strict';

const { db, aql } = require('@arangodb');
const { SERVICE_GRAPHS, TRANSIENT_EVENT_SUPERNODE } = require('../../helpers');
const {
  getScopeFilters, getLimitClause, getSortingClause, getGroupingClause, getScopeFor, getSearchPattern,
  getScopeInitializers
} = require('./helpers');

module.exports = function log(path = '/',
  { since, until, skip = 0, limit = 0, sortType = null, groupBy = null, countsOnly = false } = {}) {
  const scope = getScopeFor(path);
  const searchPattern = getSearchPattern(scope, path);

  const queryParts = [
    getScopeInitializers(scope, searchPattern),
    aql`
      for v, e, p in 2..${Number.MAX_SAFE_INTEGER}
      outbound ${TRANSIENT_EVENT_SUPERNODE._id}
      graph ${SERVICE_GRAPHS.eventLog}
      filter is_same_collection('evstore_events', v)
    `,
    getScopeFilters(scope, searchPattern)
  ];

  if (since) {
    queryParts.push(aql`filter v.ctime >= ${since}`);
  }
  if (until) {
    queryParts.push(aql`filter v.ctime <= ${until}`);
  }

  queryParts.push(getGroupingClause(groupBy, countsOnly));
  queryParts.push(getSortingClause(sortType, groupBy, countsOnly));
  queryParts.push(getLimitClause(limit, skip));

  const query = aql.join(queryParts, '\n');

  return db._query(query).toArray();
};
