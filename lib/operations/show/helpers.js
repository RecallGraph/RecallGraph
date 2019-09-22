'use strict'

const { db, aql } = require('@arangodb')
const {
  getScopeFilters,
  getScopeAndSearchPatternFor,
  getScopeInitializers,
  getSort,
  getNonServiceCollections,
  getLimitClause
} = require('../helpers')
const { SERVICE_COLLECTIONS, TRANSIENT_EVENT_SUPERNODE, COLLECTION_TYPES, getCollectionType } = require('../../helpers')

const { chain, isString } = require('lodash')
const jiff = require('jiff')

// noinspection JSUnresolvedFunction
const COLL_TYPES_REF = chain(COLLECTION_TYPES).map((idx, label) => [idx, label.toLowerCase()]).fromPairs().value()

const commandColl = db._collection(SERVICE_COLLECTIONS.commands)
const evtSSLinkColl = db._collection(SERVICE_COLLECTIONS.evtSSLinks)
const snapshotLinkColl = db._collection(SERVICE_COLLECTIONS.snapshotLinks)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const snapshotColl = db._collection(SERVICE_COLLECTIONS.snapshots)

const GROUP_BY = Object.freeze({
  TYPE: 'collTypes[p.vertices[1][\'origin-for\']]',
  COLLECTION: 'p.vertices[1][\'origin-for\']'
})

function getGroupExpr (groupByKey) {
  return isString(groupByKey) && GROUP_BY[groupByKey.toUpperCase()]
}

function getShowQueryPrefix (timestamp) {
  return aql`
    for v, e, p in 2..${Number.MAX_SAFE_INTEGER}
    any ${TRANSIENT_EVENT_SUPERNODE._id}
    ${commandColl}, ${evtSSLinkColl}, outbound ${snapshotLinkColl}
      prune (length(p.vertices) >= 3)
      and (
        (
          is_same_collection(${eventColl}, p.vertices[-1])
          and is_same_collection(${eventColl}, p.vertices[-2])
          and p.vertices[-1].ctime > p.vertices[-2].ctime
          and p.vertices[-2].ctime > ${timestamp}
        )
        or (
          is_same_collection(${snapshotColl}, p.vertices[-1])
          and is_same_collection(${snapshotColl}, p.vertices[-2])
          and p.vertices[-2].ctime > ${timestamp}
        )
      )
      options {bfs: true, uniqueVertices: 'path'}
  `
}

function getShowQueryFilters (timestamp) {
  return aql`
    filter is_same_collection(${eventColl}, v)
    let vPrev = p.vertices[-2]
    let onEventTrack = (length(p.vertices) > 3) and is_same_collection(${eventColl}, vPrev)
    let vIsPrior = (v.ctime <= ${timestamp})
    let vIsAfter = (v.ctime > ${timestamp})
    let vPrevIsPrior = (vPrev.ctime <= ${timestamp})
    let vPrevIsAfter = (vPrev.ctime > ${timestamp})
    let overshot = onEventTrack and vIsAfter and vPrevIsPrior
    let undershot = onEventTrack and vIsPrior and vPrevIsAfter
    let coll = parse_identifier(v.meta._id).collection
    filter overshot or undershot or (
        vIsPrior 
        and v.event != 'deleted'
        and v.meta._rev == document(coll, v.meta._id)._rev
    )
  `
}

function getCollTypeInitializer () {
  const collTypes = {}
  const nonServiceCollections = getNonServiceCollections()

  for (let coll of nonServiceCollections) {
    collTypes[coll] = COLL_TYPES_REF[getCollectionType(coll)]
  }

  return aql`let collTypes = ${collTypes}`
}

exports.getShowQueryInitializer = function getShowQueryInitializer (path, timestamp) {
  const { scope, searchPattern } = getScopeAndSearchPatternFor(path)

  return [
    getCollTypeInitializer(),
    getScopeInitializers(scope, searchPattern),
    getShowQueryPrefix(timestamp),
    getScopeFilters(scope, searchPattern),
    getShowQueryFilters(timestamp)
  ]
}

exports.getGroupingClause = function getGroupingClause (groupBy, countsOnly) {
  const groupExpr = getGroupExpr(groupBy)
  const groupingPrefix = groupExpr ? `collect ${groupBy} = ${groupExpr} ` : countsOnly ? 'collect ' : ''
  const groupingSuffix = countsOnly ? 'with count into total' : groupExpr ? 'into paths = p' : ''

  return aql.literal(`${groupingPrefix}${groupingSuffix}`)
}

exports.getSortingClause = function getSortingClause (sort = 'asc', groupBy, countsOnly) {
  const sortDir = getSort(sort)
  const groupExpr = getGroupExpr(groupBy)
  const sortPrefix = (groupExpr || !countsOnly) ? 'sort ' : ''
  const primarySort = !sortPrefix ? '' : (countsOnly ? 'total' : groupExpr ? groupBy : 'v.meta._id') + ` ${sortDir}`
  const secondarySort = primarySort && groupBy && countsOnly ? `, ${groupBy} asc` : ''

  return aql.literal(`${sortPrefix}${primarySort}${secondarySort}`)
}

exports.getReturnClause = function getReturnClause (
  groupBy,
  countsOnly,
  groupSort,
  groupSkip,
  groupLimit
) {
  const groupExpr = getGroupExpr(groupBy)
  let returnClause

  if (groupExpr) {
    if (countsOnly) {
      returnClause = aql.literal(`return {${groupBy}, total}`)
    } else {
      const groupSortDir = getSort(groupSort)

      const queryParts = [
        aql.literal(`return {${groupBy}, paths: (`),
        aql.literal(`for p in paths sort p.vertices[-1]._id ${groupSortDir}`)
      ]
      queryParts.push(getLimitClause(groupLimit, groupSkip))
      queryParts.push(aql.literal('return p)}'))

      returnClause = aql.join(queryParts, ' ')
    }
  } else if (countsOnly) {
    returnClause = aql.literal(
      'return {total}'
    )
  } else {
    returnClause = aql.literal(
      'return p'
    )
  }

  return returnClause
}

exports.patch = function patch (paths, timestamp) {
  const nodes = []
  for (let p of paths) {
    let diffs = []
    let startingNode = p.vertices[1]; let startingIdx = 1

    for (let i = p.vertices.length - 1; i > 1; i--) {
      const v = p.vertices[i]
      if ((i === p.vertices.length - 1) && (v.ctime > timestamp)) {
        continue
      }

      if (v._id.startsWith(SERVICE_COLLECTIONS.snapshots)) {
        startingNode = v
        diffs.pop()
        startingIdx = i + 1
        break
      }

      diffs.push(p.edges[i - 1].command)
    }

    if ((startingIdx > 1) && (p.edges[startingIdx]._to === p.vertices[startingIdx]._id)) {
      // Reverse the individual diffs
      diffs = diffs.map(c => jiff.inverse(c))
    }

    diffs.reverse()

    let node = startingNode.data || {}
    for (let d of diffs) {
      node = jiff.patch(d, node, {})
    }

    nodes.push(node)
  }

  return nodes
}
