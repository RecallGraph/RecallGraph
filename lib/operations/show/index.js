'use strict'

const { db } = require('@arangodb')
const { buildShowQuery, patch } = require('./helpers')
const { filter } = require('../helpers')

module.exports = function show (path = '/', timestamp,
  { sort = 'asc', skip, limit, groupBy, countsOnly, groupSort = 'asc', groupSkip, groupLimit, postFilter } = {}) {
  const query = buildShowQuery(
    { path, timestamp, sort, skip, limit, groupBy, countsOnly, groupSort, groupSkip, groupLimit })
  const paths = db._query(query).toArray()

  let results
  if (groupBy) {
    if (countsOnly) {
      results = paths
    } else {
      results = paths.map(group => {
        let groupKey = groupBy.toLowerCase()

        return {
          [groupKey]: group[groupKey],
          nodes: patch(group.paths)
        }
      })
    }
  } else if (countsOnly) {
    results = paths
  } else {
    results = patch(paths)
  }

  return postFilter ? filter(results, postFilter) : results
}
