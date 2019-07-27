'use strict'

const { aql } = require('@arangodb')
const {
  isString
} = require('lodash')

const GROUP_BY = Object.freeze({
  NODE: 'v.meta._id',
  COLLECTION: 'p.vertices[1][\'origin-for\']',
  EVENT: 'v.event'
})

const SORT_TYPES = Object.freeze({
  ASC: 'asc',
  DESC: 'desc'
})

function getSortType (sortTypeKey) {
  return isString(sortTypeKey)
    ? SORT_TYPES[sortTypeKey.toUpperCase()]
    : SORT_TYPES.DESC
}

function getGroupExpr (groupByKey) {
  return isString(groupByKey) && GROUP_BY[groupByKey.toUpperCase()]
}

exports.getSortingClause = function getSortingClause (
  sortType,
  groupBy,
  countsOnly
) {
  const sortDir = getSortType(sortType)
  let sortExpr
  let primarySort = null
  let secSort

  const groupExpr = getGroupExpr(groupBy)
  if (groupExpr) {
    secSort = `${groupBy} asc`

    if (countsOnly) {
      primarySort = 'total'
    }
  } else {
    primarySort = 'v.ctime'
    secSort = 'v._id asc'
  }

  if (primarySort) {
    sortExpr = `sort ${primarySort} ${sortDir}, ${secSort}`
  } else {
    sortExpr = `sort ${secSort}`
  }

  return aql.literal(sortExpr)
}

exports.getGroupingClause = function getGroupingClause (groupBy, countsOnly) {
  const groupExpr = getGroupExpr(groupBy)
  if (groupExpr) {
    let groupingSuffix

    if (countsOnly) {
      groupingSuffix = 'with count into total'
    } else {
      groupingSuffix = 'into events = keep(v, \'_id\', \'ctime\', \'event\', \'meta\')'
    }

    return aql.literal(`collect ${groupBy} = ${groupExpr} ${groupingSuffix}`)
  }

  return aql.literal('')
}

exports.getReturnClause = function getReturnClause (
  sortType,
  groupBy,
  countsOnly
) {
  let returnClause = aql.literal(
    "return keep(v, '_id', 'ctime', 'event', 'meta')"
  )

  const groupExpr = getGroupExpr(groupBy)
  if (groupExpr) {
    if (countsOnly) {
      returnClause = aql.literal(`return {${groupBy}, total}`)
    } else {
      const sortDir = getSortType(sortType)
      returnClause = aql.literal(`
        return {
          ${groupBy},
          events: (for ev in events sort ev.ctime ${sortDir} return ev)
        }
      `)
    }
  }

  return returnClause
}
