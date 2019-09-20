'use strict'

// noinspection NpmUsedModulesInstalled
const { aql } = require('@arangodb')
// noinspection NpmUsedModulesInstalled
const { isString } = require('lodash')
const { getLimitClause, getSort } = require('../helpers')

const GROUP_BY = Object.freeze({
  NODE: 'v.meta._id',
  COLLECTION: 'p.vertices[1][\'origin-for\']',
  EVENT: 'v.event'
})

function getGroupExpr (groupByKey) {
  return isString(groupByKey) && GROUP_BY[groupByKey.toUpperCase()]
}

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
      groupingSuffix = 'into events = merge(v, {command: e.command})'
    } else {
      groupingSuffix = 'into events = v'
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
      'return merge(v, {command: e.command})'
    )
  } else {
    returnClause = aql.literal(
      'return v'
    )
  }

  return returnClause
}
