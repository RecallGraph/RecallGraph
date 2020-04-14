/* eslint eqeqeq:0 */
'use strict'

const {
  difference, values, chain, concat, find, isString, stubFalse, negate, identity, isFunction, memoize
} = require('lodash')
const _ = require('lodash')
const minimatch = require('minimatch')
const expand = require('brace-expansion')
const gg = require('@arangodb/general-graph')
const {
  SERVICE_GRAPHS, SERVICE_COLLECTIONS, TRANSIENT_EVENT_SUPERNODE, getCollectionType, COLLECTION_TYPES,
  getComponentTagOption
} = require('../helpers')
const { aql, db } = require('@arangodb')
const jsep = require('jsep')
const { utils: { attachSpan } } = require('foxx-tracing')

const commandColl = db._collection(SERVICE_COLLECTIONS.commands)
const cto = getComponentTagOption(__filename)

const COLL_TYPES_REF = Object.freeze(
  chain(COLLECTION_TYPES).map((idx, label) => [idx, label.toLowerCase()]).fromPairs().value())
exports.COLL_TYPES_REF = COLL_TYPES_REF

const OP_MAP = Object.freeze({
  'typeof': (val) => typeof val,
  glob: (str, pattern) => isString(pattern) && isString(str) && minimatch(str, pattern),
  regx: (str, pattern) => {
    if (isString(pattern) && isString(str)) {
      try {
        const regex = getRegExp(pattern)

        return regex.test(str)
      } catch (e) {}
    }

    return false
  }
})
exports.OP_MAP = OP_MAP

jsep.addBinaryOp('=~', 6)
jsep.addBinaryOp('=*', 6)
jsep.addBinaryOp('in', 6)
jsep.addBinaryOp('**', 4)
jsep.addLiteral('$Math', Math)
jsep.addLiteral('$_', _)
jsep.addLiteral('$RG', OP_MAP)

const getAST = jsep
exports.getAST = getAST

const getRegExp = memoize(pattern => new RegExp(pattern))

function getParseTree (ast) {
  switch (ast.type) {
    case 'Identifier':
      return (node) => node[ast.name]
    case 'Literal':
      return () => ast.value
    case 'MemberExpression':
      const memberFn = (node) => (getParseTree(ast.object)(node) || {})
      const propertyFn = getParseTree(ast.property)

      return ast.computed ? (node) => memberFn(node)[propertyFn(node)] : (node) => propertyFn(memberFn(node))
    case 'ArrayExpression':
      const fnArr = ast.elements.map(getParseTree)

      return (node) => fnArr.map(fn => fn(node))
    case 'CallExpression':
      const argFns = ast.arguments.map(getParseTree)

      let callee
      let thisRef = _
      switch (ast.callee.type) {
        case 'Identifier':
          callee = getParseTree(ast.callee)
          break
        case 'MemberExpression':
          callee = getParseTree(ast.callee)
          thisRef = ast.callee.object.value
          break
        case 'CallExpression':
          callee = getParseTree(ast.callee.callee)
      }

      return (node) => {
        const thisObj = thisRef || node
        let resolved
        if (ast.callee.type === 'CallExpression') {
          const callArgs = ast['callee'].arguments.map(getParseTree)

          resolved = callee(thisObj).apply(thisObj, callArgs.map(fn => fn(node)))
        } else {
          resolved = callee(thisObj)
        }

        const args = argFns.map(fn => fn(node))
        const thisBinding = (thisObj === node) && ast.callee.object ? getParseTree(ast.callee.object)(node) : thisObj

        return isFunction(resolved) ? resolved.apply(thisBinding, args) : false
      }

    case 'LogicalExpression':
    case 'BinaryExpression':
      const left = getParseTree(ast.left)
      const right = getParseTree(ast.right)

      switch (ast.operator) {
        case '==':
          // noinspection EqualityComparisonWithCoercionJS
          return (node) => left(node) == right(node)
        case '===':
          return (node) => left(node) === right(node)
        case '!=':
          // noinspection EqualityComparisonWithCoercionJS
          return (node) => left(node) != right(node)
        case '!==':
          return (node) => left(node) !== right(node)
        case '<':
          return (node) => left(node) < right(node)
        case '>':
          return (node) => left(node) > right(node)
        case '<=':
          return (node) => left(node) <= right(node)
        case '>=':
          return (node) => left(node) >= right(node)
        case 'in':
          return (node) => {
            const resolvedRight = right(node)

            return Array.isArray(resolvedRight) && left(node) in resolvedRight
          }
        case '=~':
          return (node) => OP_MAP.regx(left(node), right(node))
        case '=*':
          return (node) => OP_MAP.glob(left(node), right(node))
        case '&&':
          return (node) => left(node) && right(node)
        case '||':
          return (node) => left(node) || right(node)
        case '^':
          return (node) => left(node) ^ right(node)
        case '|':
          return (node) => left(node) | right(node)
        case '&':
          return (node) => left(node) & right(node)
        case '<<':
          return (node) => left(node) << right(node)
        case '>>':
          return (node) => left(node) >> right(node)
        case '>>>':
          return (node) => left(node) >>> right(node)
        case '+':
          return (node) => left(node) + right(node)
        case '-':
          return (node) => left(node) - right(node)
        case '*':
          return (node) => left(node) * right(node)
        case '/':
          return (node) => left(node) / right(node)
        case '%':
          return (node) => left(node) % right(node)
        case '**':
          return (node) => left(node) ** right(node)
        default:
          return stubFalse
      }
    case 'UnaryExpression':
      const argEval = getParseTree(ast.argument)

      switch (ast.operator) {
        case '!':
          return negate(argEval)
        case '-':
          return (node) => -argEval(node)
        case '~':
          return (node) => ~argEval(node)
        case '+':
          return (node) => +argEval(node)

        default:
          return stubFalse
      }
    case 'ThisExpression':
      return identity
    case 'ConditionalExpression':
      const test = getParseTree(ast.test)
      const consequent = getParseTree(ast.consequent)
      const alternate = getParseTree(ast.alternate)

      return (node) => test(node) ? consequent(node) : alternate(node)
  }
}

exports.parseExpr = function parseExpr (expr) {
  const ast = getAST(expr)

  return getParseTree(ast)
}

exports.filter = attachSpan(function filter (nodes, filterExpr) {
  const ast = getAST(filterExpr)
  const filterFn = getParseTree(ast)

  return nodes.filter(filterFn)
}, 'filter', cto)

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

function getCollTypes () {
  const collTypes = {}
  const nonServiceCollections = getNonServiceCollections()

  for (const coll of nonServiceCollections) {
    collTypes[coll] = COLL_TYPES_REF[getCollectionType(coll)]
  }

  return collTypes
}

exports.getCollTypes = getCollTypes

function getCollTypeInitializer () {
  const collTypes = getCollTypes()

  return aql`let collTypes = ${collTypes}`
}

exports.getCollTypeInitializer = getCollTypeInitializer

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
        filter: aql`filter p.vertices[2].meta.id =~ ${idPattern}`,
        prune: aql`length(p.edges) == 2 && v.meta.id !~ ${idPattern}`
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
            filter p.edges[1].meta.id in idGroups[collName]
          `, // See initializers below for idGroups definition.
        prune: aql`
            length(p.edges) == 2 && (p.vertices[1]['origin-for'] not in ${collMatches}
              || p.edges[1].meta.id not in idGroups[p.vertices[1]['origin-for']])
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
    getCollTypeInitializer(),
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
