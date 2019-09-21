'use strict'

// noinspection NpmUsedModulesInstalled
const { db, aql } = require('@arangodb')
const { getLimitClause } = require('../helpers')
const { getShowQueryInitializer, getGroupingClause, getSortingClause, getReturnClause, patch } = require('./helpers')

module.exports = function show (path = '/', timestamp,
  { sort, skip, limit, groupBy, countsOnly, groupSort, groupSkip, groupLimit } = {}) {
  const queryParts = getShowQueryInitializer(path, timestamp)
  queryParts.push(getGroupingClause(groupBy, countsOnly))
  queryParts.push(getSortingClause(sort, groupBy, countsOnly))
  queryParts.push(getLimitClause(limit, skip))
  queryParts.push(getReturnClause(groupBy, countsOnly, groupSort, groupSkip, groupLimit))

  const query = aql.join(queryParts, '\n')
  // console.log(query)
  const paths = db._query(query).toArray()
  // console.log(paths)

  if (groupBy) {
    if (countsOnly) {
      return paths
    } else {
      return paths.map(group => {
        let groupKey = groupBy.toLowerCase()

        return {
          [groupKey]: group[groupKey],
          nodes: patch(group.paths)
        }
      })
    }
  } else if (countsOnly) {
    return paths[0]
  } else {
    return patch(paths, timestamp)
  }
}
