'use strict'

const { difference, values, chain, concat, find } = require('lodash')
const minimatch = require('minimatch')
const expand = require('brace-expansion')
const gg = require('@arangodb/general-graph')
const { SERVICE_GRAPHS, SERVICE_COLLECTIONS, TRANSIENT_EVENT_SUPERNODE } = require('../helpers')
const { aql, db } = require('@arangodb')

const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

function getMatchingCollNames (graphNames) {
  return chain(graphNames)
    .map(gg._graph)
    .map(graph => concat(graph._vertexCollections(), graph._edgeCollections()))
    .flatten()
    .invokeMap('name')
    .uniq()
    .value()
}
exports.getMatchingCollNames = getMatchingCollNames

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

function getScopeInitializers (scope, searchPattern) {
  return scope.initializers ? scope.initializers(searchPattern) : aql.literal('')
}
exports.getScopeInitializers = getScopeInitializers

function getEventLogQueryPrefix () {
  return aql`
    for v, e, p in 2..${Number.MAX_SAFE_INTEGER}
    outbound ${TRANSIENT_EVENT_SUPERNODE._id}
    ${commandColl}
  `
}

function getScopeFilters (scope, searchPattern) {
  return scope.filters ? scope.filters(searchPattern) : {
    filter: aql.literal(''),
    prune: aql.literal('false')
  }
}

exports.getScopeFilters = getScopeFilters

function getTimeBoundFilters (since, until) {
  const filters = []
  let prune = aql.literal('false')

  if (since) {
    filters.push(aql`filter v.ctime >= ${since}`)
  }
  if (until) {
    prune = aql`v.ctime > ${until}`
    filters.push(aql`filter v.ctime <= ${until}`)
  }

  return { prune, filters }
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
      const collNames = getMatchingCollNames(matches)

      return {
        filter: aql`filter p.vertices[1]['origin-for'] in ${collNames}`,
        prune: aql`length(p.edges) == 1 && v['origin-for'] not in ${collNames}`
      }
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

      return {
        filter: aql`filter p.vertices[1]['origin-for'] in ${matches}`,
        prune: aql`length(p.edges) == 1 && v['origin-for'] not in ${matches}`
      }
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

      return {
        filter: aql`filter p.vertices[2].meta._id =~ ${idPattern}`,
        prune: aql`length(p.edges) == 2 && v.meta._id !~ ${idPattern}`
      }
    }
  }
}

exports.getNodeGlobScope = getNodeGlobScope

function getNodeBraceScope (collections) {
  return {
    pathPattern: '/n/**',
    prefix: '/n/',
    filters: searchPattern => {
      const collMatches = chain(expand(searchPattern))
        .map(pattern => pattern.split('/')[0])
        .intersection(collections)
        .value()

      return {
        filter: aql`
            let collName = p.vertices[1]['origin-for']
            filter collName in ${collMatches}
            filter p.edges[1].meta._id in idGroups[collName]
          `, // See initializers below for idGroups definition.
        prune: aql`
            length(p.edges) == 2 && (p.vertices[1]['origin-for'] not in ${collMatches}
              || p.edges[1].meta._id not in idGroups[p.vertices[1]['origin-for']])
          `
      }
    },
    initializers: searchPattern => {
      const idMatchesWrapper = chain(expand(searchPattern))
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
  const scopeFilters = getScopeFilters(scope, searchPattern)
  const timeBoundFilters = getTimeBoundFilters(since, until)
  const pruneFilters = aql.join([scopeFilters.prune, timeBoundFilters.prune], ' || ')
  const pruneClause = aql.join([aql.literal('prune'), pruneFilters], ' ')

  const queryParts = [
    getScopeInitializers(scope, searchPattern),
    getEventLogQueryPrefix(),
    pruneClause,
    scopeFilters.filter
  ]

  timeBoundFilters.filters.forEach(filter => queryParts.push(filter))

  return queryParts
}

const SORT_TYPES = Object.freeze({
  ASC: 'asc',
  DESC: 'desc'
})

exports.getSort = function getSort (sortKey) {
  return SORT_TYPES[sortKey.toUpperCase()]
}
