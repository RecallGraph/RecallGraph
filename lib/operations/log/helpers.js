'use strict'

// noinspection NpmUsedModulesInstalled
const { aql } = require('@arangodb')
// noinspection NpmUsedModulesInstalled
const { isString } = require('lodash')

const GROUP_BY = Object.freeze({
  NODE: 'v.meta._id',
  COLLECTION: 'p.vertices[1][\'origin-for\']',
  EVENT: 'v.event'
})

const SORT_TYPES = Object.freeze({
  ASC: 'asc',
  DESC: 'desc'
})

function getSort (sortKey) {
  return isString(sortKey)
    ? SORT_TYPES[sortKey.toUpperCase()]
    : SORT_TYPES.DESC
}

function getGroupExpr (groupByKey) {
  return isString(groupByKey) && GROUP_BY[groupByKey.toUpperCase()]
}

function getLimitClause (limit, skip) {
  if (limit) {
    if (skip) {
      return aql`limit ${skip}, ${limit}`
    } else {
      return aql`limit ${limit}`
    }
  }

  return aql.literal('')
}

exports.getLimitClause = getLimitClause

exports.getSortingClause = function getSortingClause (
  sort,
  groupBy,
  countsOnly
) {
  const sortDir = getSort(sort)
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

exports.getGroupingClause = function getGroupingClause (groupBy, countsOnly, returnCommands) {
  const groupExpr = getGroupExpr(groupBy)
  if (groupExpr) {
    let groupingSuffix

    if (countsOnly) {
      groupingSuffix = 'with count into total'
    } else if (returnCommands) {
      groupingSuffix = 'into events = merge(keep(v, "_id", "ctime", "event", "meta"), {command: e.command})'
    } else {
      groupingSuffix = 'into events = keep(v, "_id", "ctime", "event", "meta")'
    }

    return aql.literal(`collect ${groupBy} = ${groupExpr} ${groupingSuffix}`)
  }

  return aql.literal('')
}

exports.getReturnClause = function getReturnClause (
  groupBy,
  countsOnly,
  groupSort,
  groupSkip,
  groupLimit,
  returnCommands
) {
  const groupExpr = getGroupExpr(groupBy)
  let returnClause

  if (groupExpr) {
    if (countsOnly) {
      returnClause = aql.literal(`return {${groupBy}, total}`)
    } else {
      const groupSortDir = getSort(groupSort)

      const queryParts = [
        aql.literal(`return {${groupBy}, events: (`),
        aql.literal(`for ev in events sort ev.ctime ${groupSortDir}`)
      ]
      queryParts.push(getLimitClause(groupLimit, groupSkip))
      queryParts.push(aql.literal('return ev)}'))

      returnClause = aql.join(queryParts, ' ')
    }
  } else if (returnCommands) {
    returnClause = aql.literal(
      'return merge(keep(v, "_id", "ctime", "event", "meta"), {command: e.command})'
    )
  } else {
    returnClause = aql.literal(
      'return keep(v, "_id", "ctime", "event", "meta")'
    )
  }

  return returnClause
}
