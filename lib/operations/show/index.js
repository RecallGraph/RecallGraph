'use strict'

const { db } = require('@arangodb')
const { buildShowQuery, patch } = require('./helpers')

module.exports = function show (path = '/', timestamp,
  { sort = 'asc', skip, limit, groupBy, countsOnly, groupSort = 'asc', groupSkip, groupLimit } = {}) {
  const query = buildShowQuery(
    { path, timestamp, sort, skip, limit, groupBy, countsOnly, groupSort, groupSkip, groupLimit })
  const paths = db._query(query).toArray()

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
    return patch(paths)
  }
}
