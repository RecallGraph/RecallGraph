'use strict'

// noinspection NpmUsedModulesInstalled
const {
  difference,
  values,
  fromPairs,
  chain,
  concat,
  invokeMap,
  find,
  isString
} = require('lodash')
// noinspection NpmUsedModulesInstalled
const minimatch = require('minimatch')
const expand = require('brace-expansion')
// noinspection NpmUsedModulesInstalled
const gg = require('@arangodb/general-graph')
const { SERVICE_GRAPHS, SERVICE_COLLECTIONS, TRANSIENT_EVENT_SUPERNODE } = require('../helpers')
// noinspection NpmUsedModulesInstalled
const { aql, db } = require('@arangodb')

function getMatchingCollNames (graphNames, matches) {
  const graphCollectionNamesMapWrapper = getGraphCollectionNamesMap(graphNames)

  return graphCollectionNamesMapWrapper
    .at(matches)
    .flatten()
    .uniq()
    .value()
}

function getGraphCollectionNamesMap (graphNames) {
  return chain(graphNames)
    .map(name => {
      const graph = gg._graph(name)
      const collections = invokeMap(
        concat(graph._vertexCollections(), graph._edgeCollections()),
        'name'
      )

      return [name, collections]
    })
    .thru(fromPairs)
}

function getNonServiceCollections () {
  return difference(
    db._collections().map(coll => coll.name()).filter(collName => !collName.startsWith('_')),
    values(SERVICE_COLLECTIONS)
  )
}

exports.getNonServiceCollections = getNonServiceCollections

function getScopeAndSearchPatternFor (path) {
  const collections = getNonServiceCollections()
  const scopes = getAvailableScopes(collections)

  const scope = find(scopes, scope => minimatch(path, scope.pathPattern))
  const searchPattern = scope.prefix ? path.substring(scope.prefix.length) : path

  return { scope, searchPattern }
}

exports.getScopeAndSearchPatternFor = getScopeAndSearchPatternFor

function getScopeInitializers (
  scope,
  searchPattern
) {
  return scope.initializers
    ? scope.initializers(searchPattern)
    : aql.literal('')
}

exports.getScopeInitializers = getScopeInitializers

function getEventLogQueryPrefix () {
  return aql`
    for v, e, p in 2..${Number.MAX_SAFE_INTEGER}
    outbound ${TRANSIENT_EVENT_SUPERNODE._id}
    graph ${SERVICE_GRAPHS.eventLog}
    filter is_same_collection(${SERVICE_COLLECTIONS.events}, v)
  `
}

function getScopeFilters (scope, searchPattern) {
  return scope.filters ? scope.filters(searchPattern) : aql.literal('')
}

exports.getScopeFilters = getScopeFilters

function getTimeBoundFilters (since, until) {
  const filters = []

  if (since) {
    filters.push(aql`filter v.ctime >= ${since}`)
  }
  if (until) {
    filters.push(aql`filter v.ctime <= ${until}`)
  }

  return filters
}

exports.getTimeBoundFilters = getTimeBoundFilters

function getDBScope () {
  return {
    pathPattern: '/'
  }
}

exports.getDBScope = getDBScope

function getGraphScope () {
  return {
    pathPattern: '/g/*',
    prefix: '/g/',
    filters: searchPattern => {
      const graphNames = difference(gg._list(), values(SERVICE_GRAPHS))
      const matches = minimatch.match(graphNames, searchPattern)
      const collNames = getMatchingCollNames(graphNames, matches)

      return aql`filter p.vertices[1]['origin-for'] in ${collNames}`
    }
  }
}

exports.getGraphScope = getGraphScope

function getCollectionScope (collections) {
  return {
    pathPattern: '/c/*',
    prefix: '/c/',
    filters: searchPattern => {
      const matches = minimatch.match(collections, searchPattern)

      return aql`filter p.vertices[1]['origin-for'] in ${matches}`
    }
  }
}

exports.getCollectionScope = getCollectionScope

function getNodeGlobScope () {
  return {
    pathPattern: '/ng/**',
    prefix: '/ng/',
    filters: searchPattern => {
      const idPattern = minimatch.makeRe(searchPattern).source

      return aql`filter regex_test(p.vertices[2].meta._id, ${idPattern})`
    }
  }
}

exports.getNodeGlobScope = getNodeGlobScope

function getNodeBraceScope (collections) {
  return {
    pathPattern: '/n/**',
    prefix: '/n/',
    filters: searchPattern => {
      // noinspection JSUnresolvedFunction
      const collMatches = chain(expand(searchPattern))
        .map(pattern => pattern.split('/')[0])
        .intersection(collections)
        .value()

      return aql`
        let collName = p.vertices[1]['origin-for']
        filter collName in ${collMatches}
        filter p.edges[1].meta._id in idGroups[collName]
      ` // See initializers below for idGroups definition.
    },
    initializers: searchPattern => {
      const idMatchesWrapper = chain(expand(searchPattern))
      // noinspection JSUnresolvedFunction
      const collMatches = idMatchesWrapper
        .map(pattern => pattern.split('/')[0])
        .intersection(collections)
        .value()
      const idGroups = idMatchesWrapper
        .map(match => match.split('/'))
        .filter(matchPair => collMatches.includes(matchPair[0]))
        .transform((groups, matchPair) => {
          const group = matchPair[0]
          groups[group] = groups[group] || []
          groups[group].push(matchPair.join('/'))
        }, {})
        .value()

      return aql`let idGroups = ${idGroups}`
    }
  }
}

exports.getNodeBraceScope = getNodeBraceScope

function getAvailableScopes (collections) {
  return {
    database: getDBScope(),
    graph: getGraphScope(),
    collection: getCollectionScope(collections),
    nodeGlob: getNodeGlobScope(),
    nodeExact: getNodeBraceScope(collections)
  }
}

exports.getLimitClause = function getLimitClause (limit, skip) {
  if (limit) {
    if (skip) {
      return aql`limit ${skip}, ${limit}`
    } else {
      return aql`limit ${limit}`
    }
  }

  return aql.literal('')
}

exports.getEventLogQueryInitializer = function getEventLogQueryInitializer (path, since, until) {
  const { scope, searchPattern } = getScopeAndSearchPatternFor(path)

  const queryParts = [
    getScopeInitializers(scope, searchPattern),
    getEventLogQueryPrefix(),
    getScopeFilters(scope, searchPattern)
  ]

  const timeBoundFilters = getTimeBoundFilters(since, until)
  timeBoundFilters.forEach(filter => queryParts.push(filter))

  return queryParts
}

const SORT_TYPES = Object.freeze({
  ASC: 'asc',
  DESC: 'desc'
})

exports.getSort = function getSort (sortKey) {
  return isString(sortKey)
    ? SORT_TYPES[sortKey.toUpperCase()]
    : SORT_TYPES.DESC
}
