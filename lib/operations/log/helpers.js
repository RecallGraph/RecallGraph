'use strict'

const { aql } = require('@arangodb')

const { isString } = require('lodash')
const { getLimitClause, getSort } = require('../helpers')

const GROUP_BY = Object.freeze({
  NODE: 'v.meta.id',
  COLLECTION: 'v.collection',
  EVENT: 'v.event',
  TYPE: 'collTypes[v.collection]'
})

function getGroupExpr (groupByKey) {
  return isString(groupByKey) && GROUP_BY[groupByKey.toUpperCase()]
}

exports.getGroupExpr = getGroupExpr

exports.getSortingClause = function getSortingClause (sort, groupBy, countsOnly) {
  const sortDir = getSort(sort)
  const groupExpr = getGroupExpr(groupBy)
  const sortPrefix = (groupExpr || !countsOnly) ? 'sort ' : ''
  const primarySort = getPrimarySort(sortPrefix, groupExpr, countsOnly, groupBy, sortDir)
  const secondarySort = getSecondarySort(primarySort, groupExpr, countsOnly, groupBy)

  return aql.literal(`${sortPrefix}${primarySort}${secondarySort}`)
}

function getPrimarySort (sortPrefix, groupExpr, countsOnly, groupBy, sortDir) {
  let primarySort = ''

  if (sortPrefix) {
    if (countsOnly) {
      primarySort = 'total'
    } else if (groupExpr) {
      primarySort = groupBy
    } else {
      primarySort = 'v.ctime'
    }

    primarySort += ` ${sortDir}`
  }

  return primarySort
}

function getSecondarySort (primarySort, groupExpr, countsOnly, groupBy) {
  let secondarySort = ''

  if (primarySort) {
    if (groupExpr && countsOnly) {
      secondarySort = `, ${groupBy} asc`
    } else if (!(groupExpr || countsOnly)) {
      secondarySort = ', v._id asc'
    }
  }

  return secondarySort
}

exports.getGroupingClause = function getGroupingClause (groupBy, countsOnly) {
  const groupExpr = getGroupExpr(groupBy)
  if (groupExpr) {
    let groupingSuffix

    if (countsOnly) {
      groupingSuffix = 'with count into total'
    } else {
      groupingSuffix = 'into events = v'
    }

    return aql.literal(`collect ${groupBy} = ${groupExpr} ${groupingSuffix}`)
  } else if (countsOnly) {
    return aql.literal('collect with count into total')
  }

  return aql.literal('')
}

exports.getReturnClause = function getReturnClause (groupBy, countsOnly, groupSort, groupSkip, groupLimit) {
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
  } else if (countsOnly) {
    returnClause = aql.literal('return {total}')
  } else {
    returnClause = aql.literal('return v')
  }

  return returnClause
}
