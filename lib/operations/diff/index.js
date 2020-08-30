'use strict'

const { aql } = require('@arangodb')
const { getLimitClause, filter, getEventLogQueryInitializer } = require('../helpers')
const { getGroupingClause, getReturnClause, extractDiffs } = require('./helpers')
const { getSortingClause } = require('../log/helpers')
const { utils: { attachSpan, instrumentedQuery } } = require('@recallgraph/foxx-tracer')
const { getComponentTagOption } = require('../../helpers')

const cto = getComponentTagOption(__filename)
function diff (path = '/', { since, until, sort = 'asc', skip, limit, reverse, postFilter } = {}) {
  const queryParts = getEventLogQueryInitializer(path, since, until)

  queryParts.push(getGroupingClause())
  queryParts.push(getSortingClause(sort, 'node'))
  queryParts.push(getLimitClause(limit, skip))
  queryParts.push(getReturnClause(reverse))

  const query = aql.join(queryParts, '\n')
  const commandLog = instrumentedQuery(query, 'diffQuery', cto).toArray()
  const diffs = extractDiffs(commandLog, reverse)

  return postFilter ? filter(diffs, postFilter) : diffs
}

module.exports = attachSpan(diff, 'diff', cto)
