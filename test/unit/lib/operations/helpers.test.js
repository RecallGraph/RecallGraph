/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../helpers/util/init')
const {
  getDBScope,
  getGraphScope,
  getCollectionScope,
  getNodeGlobScope,
  getNodeBraceScope,
  getLimitClause,
  getTimeBoundFilters,
  getEventLogQueryInitializer,
  getNonServiceCollections,
  getScopeAndSearchPatternFor,
  getScopeFilters,
  getScopeInitializers,
  getSort,
  getCollTypes,
  filter
} = require('../../../../lib/operations/helpers')
const { cartesian } = require('../../../helpers/util')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern, getRandomNodeBracePathPattern
} = require('../../../helpers/document')
const { getCollectionType } = require('../../../../lib/helpers')

const { concat, values, lt, gt, lte, gte, eq, get } = require('lodash')

describe('Operations Helpers - filter', () => {
  before(init.setup)

  after(init.teardown)

  it('should filter on a single Identifier expression', () => {
    const nodes = [{ x: 1, y: 1 }, { x: 0, y: 1 }, { y: 1 }]
    const filterExpr = 'x'

    const filteredNodes = filter(nodes, filterExpr)
    const expectedNodes = nodes.filter(node => node.x)

    expect(filteredNodes).to.deep.equal(expectedNodes)
  })

  it('should filter on a single Literal expression', () => {
    const nodes = [{ x: 1, y: 1 }, { x: 2, y: 1 }, { y: 1 }]
    const filterExpr = '1'

    const filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal(nodes)
  })

  it('should filter on a single MemberExpression', () => {
    const nodes = [{ x: { z: 1 }, y: 1 }, { x: { z: 0 }, y: 1 }, { x: 2, y: 1 }, { y: 1 }, { x: [0, 2, 1], y: 1 }]

    let filterExpr = 'x.z'
    let filteredNodes = filter(nodes, filterExpr)
    let expectedNodes = nodes.filter(node => (node.x || {}).z)

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'x["z"]'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'x[y]'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => (node.x || {})[node.y])

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'x.y.z'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty
  })

  it('should filter on a single ArrayExpression', () => {
    const nodes = [{ x: { z: 1 }, y: 1 }, { x: { z: 0 }, y: 1 }, { x: 2, y: 1 }, { y: 1 }]
    const filterExpr = '[x, 1, x[y]]'

    const filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal(nodes)
  })

  it('should filter on a single CallExpression', () => {
    let nodes = [{ x: { z: 1 }, y: 1 }, { x: { z: 0 }, y: 1 }, { x: 2, y: 1 }, { y: 1 }, { x: { z: 1 }, y: { z: 1 } }]
    let filterExpr = 'lt(x, 3)'
    let filteredNodes = filter(nodes, filterExpr)
    let expectedNodes = nodes.filter(node => lt(node.x, 3))

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'gt(x, 1)'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => gt(node.x, 1))

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'lte(x, 2)'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => lte(node.x, 2))

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'gte(x, 2)'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => gte(node.x, 2))

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'eq(x, 2)'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => eq(node.x, 2))

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'eq(x, y)'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => eq(node.x, node.y))

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'includes([1, 2, 3], x)'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => [1, 2, 3].includes(node.x))

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'includes([y], x.z)'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = [nodes[0]]

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'includes(2, x)'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = '$RG.typeof(x) === "number"'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => typeof node.x === 'number')

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = '$RG.typeof(x) === "object"'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => typeof node.x === 'object')

    expect(filteredNodes).to.deep.equal(expectedNodes)

    nodes = [{ x: 'abc', y: 2 }, { x: 1 }, { y: 1 }, { x: 'aabbcc' }]

    filterExpr = '$RG.glob(x, "*bc")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.glob(x, "ab*")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.glob(x, "*bc*")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = '$RG.glob(x, "*ab{c,bc*,d}")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = '$RG.glob(y, "*bc")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = '$RG.glob(x, 1)'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = '$RG.regx(x, ".*bc$")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.regx(x, "^ab.*")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.regx(x, ".*bc.*")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = '$RG.regx(x, "^a?ab[bcd]+")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = '$RG.regx(y, ".*bc")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = '$RG.regx(x, 1)'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    nodes = [{ x: [1, 2, 3], y: 1 }, { x: 1 }, { y: 1 }, { x: [4, 5, 6] }]

    filterExpr = 'isArray(x) && x.every(partial($_.includes, [1, 2, 3, 4]))'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'isArray(x) && some(x, partial($_.includes, [1, 2, 3, 4]))'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])
  })

  it('should filter on a single LogicalExpression', () => {
    const nodes = [{ x: { z: 1 }, y: 1 }, { x: { z: 0 }, y: 1 }, { x: 2, y: 1 }, { y: 1 }]

    let filterExpr = 'x == 2 && y > 0'
    let filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[2]])

    filterExpr = 'x == 2 || x.z >= 0'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal(nodes.slice(0, 3))

    filterExpr = '$RG.typeof(x.z) === "undefined" ^ y === 1'
    filteredNodes = filter(nodes, filterExpr)
    let expectedNodes = nodes.filter(node => typeof get(node, 'x.z') === 'undefined' ^ node.y === 1)

    expect(filteredNodes).to.deep.equal(expectedNodes)
  })

  it('should filter on a single UnaryExpression', () => {
    const nodes = [{ x: { z: 1 }, y: 1 }, { x: { z: 0 }, y: 1 }, { x: 2, y: 1 }, { y: 1 }]

    let filterExpr = '!(x == 2 && y > 0)'
    let filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[1], nodes[3]])

    filterExpr = '!(x == 2 || x.z >= 0)'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[3]])

    filterExpr = '$RG.typeof(x) === "number" && -x == -2'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[2]])

    filterExpr = '$RG.typeof(x) === "number" && ~x == -3'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[2]])

    filterExpr = '+(x.z) == y'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])
  })

  it('should filter on a single ThisExpression', () => {
    const nodes = [{ x: { z: 1 }, y: 1 }, { x: { z: 0 }, y: 1 }, { x: 2, y: 1 }, { y: 1 }]

    let filterExpr = '!(this.x == 2 && this.y > 0)'
    let filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[1], nodes[3]])

    filterExpr = '!(this["x"] == 2 || this.x.z >= 0)'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[3]])
  })

  it('should filter on a single ConditionalExpression', () => {
    const nodes = [{ x: { z: 1 }, y: 1 }, { x: { z: 0 }, y: 1 }, { x: 2, y: 1 }, { y: 1 }]

    let filterExpr = '($RG.typeof(x) === "object") ? (x.z == y) : (x == 2)'
    let filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[2]])
  })

  it('should filter on a single BinaryExpression', () => {
    let nodes = [{ x: { z: 1 }, y: 1 }, { x: { z: 0 }, y: 1 }, { x: 2, y: 1 }, { y: 1 }]

    let filterExpr = 'x == 2'
    let filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[2]])

    filterExpr = 'x === 2'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[2]])

    filterExpr = 'x.z < $Math.PI'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal(nodes.slice(0, 2))

    filterExpr = 'x.z == $Math.round($Math.tan($Math.PI / 4))'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'x.z < 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[1]])

    filterExpr = 'x.z > 0'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'x.z <= 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[1]])

    filterExpr = 'x.z >= 0'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[1]])

    filterExpr = 'x == 2 && y > 0'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[2]])

    filterExpr = 'x == 2 || x.z >= 0'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal(nodes.slice(0, 3))

    nodes = [{ x: 'abc', y: 2 }, { x: 1 }, { y: 1 }, { x: 'aabbcc' }]

    filterExpr = 'x =~ ".*bc$"'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'x =~ "^ab.*"'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'x =~ ".*bc.*"'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = 'x =~ "^a?ab[bcd]+"'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = 'y =~ ".*bc"'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = 'x =~ 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    nodes = [{ x: { z: 1 }, y: 1 }, { x: { z: 0 }, y: 1 }, { x: 2, y: 1 }, { y: 1 }]

    filterExpr = 'x in [1, 2, 3]'
    filteredNodes = filter(nodes, filterExpr)
    let expectedNodes = nodes.filter(node => [1, 2, 3].includes(node.x))

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'x in 2'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    nodes = [{ x: 'abc', y: 2 }, { x: 1 }, { y: 1 }, { x: 'aabbcc' }]

    filterExpr = 'x =* "*bc"'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'x =* "ab*"'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'x =* "*bc*"'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = 'x =* "*ab{c,bc*,d}"'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = 'y =* "*bc"'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = 'x =* 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = '$RG.typeof(y) == "number" && (y | 1) == 3'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.typeof(y) == "number" && (y & 1) == 0'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.typeof(y) == "number" && (y << 1) == 4'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.typeof(y) == "number" && (y >> 1) == 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.typeof(y) == "number" && (y >>> 1) == 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.typeof(y) == "number" && (y + y) == 4'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.typeof(y) == "number" && (y - 1) == 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.typeof(y) == "number" && (y * y) == 4'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.typeof(y) == "number" && (y / 2) == 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.typeof(y) == "number" && (y % 2) == 0'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = '$RG.typeof(y) == "number" && (y ** 2) == 4'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])
  })
})

describe('Operations Helpers - getCollTypes', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return collection types for all non-service collections',
    () => {
      const collTypes = getCollTypes()
      const expectedCollTypes = {}
      const nonServiceCollections = getNonServiceCollections()

      for (const coll of nonServiceCollections) {
        expectedCollTypes[coll] = getCollectionType(coll) === 2 ? 'vertex' : 'edge'
      }

      expect(collTypes).to.deep.equal(expectedCollTypes)
    })
})

describe('Operations Helpers - get{DB,Graph,Collection,Node{Glob,Brace}}Scope', () => {
  before(init.setup)

  after(init.teardown)

  it('should return the DB scope', () => {
    const path = '/'

    const scope = getDBScope()

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.equal(path)
    expect(scope).to.not.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Graph scope', () => {
    const scope = getGraphScope()

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/g/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Collection scope', () => {
    const scope = getCollectionScope()

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/c/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Node Glob scope', () => {
    const scope = getNodeGlobScope()

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/ng/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Node Brace scope', () => {
    const scope = getNodeBraceScope()

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/n/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.respondTo('initializers')
  })
})

describe('Op Helpers - getScopeAndSearchPatternFor', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return the DB scope for the root path', () => {
    const path = '/'
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.equal(path)
    expect(scope).to.not.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
    expect(path).to.include(searchPattern)
  })

  it('should return the Graph scope for a graph-prefixed path pattern', () => {
    const path = getRandomGraphPathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/g/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
    expect(path).to.include(searchPattern)
  })

  it('should return the Collection scope for a collection-prefixed path pattern', () => {
    const path = getRandomCollectionPathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/c/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
    expect(path).to.include(searchPattern)
  })

  it('should return the Node Glob scope for a node-glob-prefixed path pattern', () => {
    const path = getRandomNodeGlobPathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/ng/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
    expect(path).to.include(searchPattern)
  })

  it('should return the Node Brace scope for a node-prefixed path pattern', () => {
    const path = getRandomNodeBracePathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/n/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.respondTo('initializers')
    expect(path).to.include(searchPattern)
  })
})

describe('Op Helpers - getScopeFilters', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return the DB scope filters for the root path', () => {
    const path = '/'
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
    const scopeFilters = getScopeFilters(scope, searchPattern)

    expect(scopeFilters).to.be.an.instanceOf(Object)
    expect(scopeFilters.prune).to.be.not.empty
    expect(scopeFilters.filter).to.be.an.instanceOf(Object)
    expect(scopeFilters.filter.query).to.be.empty
  })

  it('should return the Graph scope filters for a graph-prefixed path pattern', () => {
    const path = getRandomGraphPathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
    const scopeFilters = getScopeFilters(scope, searchPattern)

    expect(scopeFilters).to.be.an.instanceOf(Object)
    expect(scopeFilters.prune).to.be.not.empty
    expect(scopeFilters.filter).to.be.an.instanceOf(Object)
    expect(scopeFilters.filter.query).to.include('filter')
  })

  it('should return the Collection scope filters for a collection-prefixed path pattern', () => {
    const path = getRandomCollectionPathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
    const scopeFilters = getScopeFilters(scope, searchPattern)

    expect(scopeFilters).to.be.an.instanceOf(Object)
    expect(scopeFilters.prune).to.be.not.empty
    expect(scopeFilters.filter).to.be.an.instanceOf(Object)
    expect(scopeFilters.filter.query).to.include('filter')
  })

  it('should return the Node Glob scope filters for a node-glob-prefixed path pattern', () => {
    const path = getRandomNodeGlobPathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
    const scopeFilters = getScopeFilters(scope, searchPattern)

    expect(scopeFilters).to.be.an.instanceOf(Object)
    expect(scopeFilters.prune).to.be.not.empty
    expect(scopeFilters.filter).to.be.an.instanceOf(Object)
    expect(scopeFilters.filter.query).to.include('filter')
  })

  it('should return the Node Brace scope filters for a node-prefixed path pattern', () => {
    const path = getRandomNodeBracePathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
    const scopeFilters = getScopeFilters(scope, searchPattern)

    expect(scopeFilters).to.be.an.instanceOf(Object)
    expect(scopeFilters.prune).to.be.not.empty
    expect(scopeFilters.filter).to.be.an.instanceOf(Object)
    expect(scopeFilters.filter.query).to.include('filter')
  })
})

describe('Op Helpers - getScopeInitializers', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return the DB scope initializers for the root path', () => {
    const path = '/'
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
    const scopeInitializers = getScopeInitializers(scope, searchPattern)

    expect(scopeInitializers).to.be.an.instanceOf(Object)
    expect(scopeInitializers.query).to.be.empty
  })

  it('should return the Graph scope initializers for a graph-prefixed path pattern', () => {
    const path = getRandomGraphPathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
    const scopeInitializers = getScopeInitializers(scope, searchPattern)

    expect(scopeInitializers).to.be.an.instanceOf(Object)
    expect(scopeInitializers.query).to.be.empty
  })

  it('should return the Collection scope initializers for a collection-prefixed path pattern', () => {
    const path = getRandomCollectionPathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
    const scopeInitializers = getScopeInitializers(scope, searchPattern)

    expect(scopeInitializers).to.be.an.instanceOf(Object)
    expect(scopeInitializers.query).to.be.empty
  })

  it('should return the Node Glob scope initializers for a node-glob-prefixed path pattern', () => {
    const path = getRandomNodeGlobPathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
    const scopeInitializers = getScopeInitializers(scope, searchPattern)

    expect(scopeInitializers).to.be.an.instanceOf(Object)
    expect(scopeInitializers.query).to.be.empty
  })

  it('should return the Node Brace scope initializers for a node-prefixed path pattern', () => {
    const path = getRandomNodeBracePathPattern()
    const { scope, searchPattern } = getScopeAndSearchPatternFor(path)
    const scopeInitializers = getScopeInitializers(scope, searchPattern)

    expect(scopeInitializers).to.be.an.instanceOf(Object)
    expect(scopeInitializers.query).to.be.not.empty
  })
})

describe('Op Helpers - getLimitClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a blank clause when no skip and limit are specified', () => {
    const limitClause = getLimitClause()

    expect(limitClause).to.be.an.instanceOf(Object)
    expect(limitClause.query).to.be.empty
  })

  it('should return a limit clause expression when only limit is specified', () => {
    const limit = 1
    const limitClause = getLimitClause(limit)

    expect(limitClause).to.be.an.instanceOf(Object)
    expect(limitClause.query).to.match(/^limit +@\w+$/i)
  })

  it('should return a limit clause expression when both limit and skip are specified', () => {
    const limit = 1
    const skip = 2
    const limitClause = getLimitClause(limit, skip)

    expect(limitClause).to.be.an.instanceOf(Object)
    expect(limitClause.query).to.match(/^limit @\w+, @\w+$/i)
  })
})

describe('Op Helpers - getTimeBoundFilters', () => {
  before(init.setup)

  after(init.teardown)

  it('should return no filters when neither since nor until are specified', () => {
    const since = null
    const until = null

    const timeBoundFilters = getTimeBoundFilters(since, until)

    expect(timeBoundFilters).to.be.an.instanceOf(Object)
    expect(timeBoundFilters.prune).to.be.not.empty
    expect(timeBoundFilters.filters).to.be.an.instanceOf(Array)
    expect(timeBoundFilters.filters).to.be.empty
  })

  it('should return a single filter when just one of since or until are specified', () => {
    const combos = [{ since: 1 }, { until: 1 }]
    combos.forEach(combo => {
      const timeBoundFilters = getTimeBoundFilters(combo.since, combo.until)

      expect(timeBoundFilters).to.be.an.instanceOf(Object)
      expect(timeBoundFilters.prune).to.be.not.empty
      expect(timeBoundFilters.filters).to.be.an.instanceOf(Array)
      expect(timeBoundFilters.filters).to.have.lengthOf(1)
      expect(timeBoundFilters.filters[0]).to.be.an.instanceOf(Object)
      expect(timeBoundFilters.filters[0].query).to.match(/filter v\.ctime [<>]= @\w+/)
    })
  })

  it('should return two filters when both since and until are specified', () => {
    const since = 1
    const until = 1

    const timeBoundFilters = getTimeBoundFilters(since, until)

    expect(timeBoundFilters).to.be.an.instanceOf(Object)
    expect(timeBoundFilters.prune).to.be.not.empty
    expect(timeBoundFilters.filters).to.be.an.instanceOf(Array)
    expect(timeBoundFilters.filters).to.have.lengthOf(2)
    timeBoundFilters.filters.forEach(tbf => {
      expect(tbf).to.be.an.instanceOf(Object)
      expect(tbf.query).to.match(/filter v\.ctime [<>]= @\w+/)
    })
  })
})

describe('Op Helpers - getEventLogQueryInitializer', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return queryParts', () => {
    const path = [
      '/', getRandomGraphPathPattern(), getRandomCollectionPathPattern(), getRandomNodeGlobPathPattern(),
      getRandomNodeBracePathPattern()
    ]
    const since = [0, 1]
    const until = [0, 1]

    const combos = cartesian({ path, since, until })
    combos.forEach(combo => {
      const queryParts = getEventLogQueryInitializer(combo.path, combo.since, combo.until)

      expect(queryParts).to.be.an.instanceOf(Array)
      expect(queryParts.length).to.be.within(5, 7)
      queryParts.forEach(queryPart => {
        expect(queryPart).to.be.an.instanceOf(Object)
        if (queryPart.hasOwnProperty('toAQL')) {
          expect(queryPart).to.respondTo('toAQL')
        } else {
          expect(queryPart).to.have.property('query')
        }
      })
    })
  })
})

describe('Op Helpers - getNonServiceCollections', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return non-service collections', () => {
    const sampleDataRefs = init.getSampleDataRefs()
    const testDataCollections = values(init.TEST_DATA_COLLECTIONS)
    const sampleNonServiceCollections = concat(testDataCollections, sampleDataRefs.vertexCollections,
      sampleDataRefs.edgeCollections)

    const nonServiceCollections = getNonServiceCollections()

    expect(nonServiceCollections).to.be.an.instanceOf(Array)
    expect(nonServiceCollections).to.include.members(sampleNonServiceCollections)
  })
})

describe('Op Helpers - getSort', () => {
  before(init.setup)

  after(init.teardown)

  it('should return asc for "asc" input', () => {
    const sortDir = getSort('asc')

    expect(sortDir).to.equal('asc')
  })

  it('should return desc for "desc" input', () => {
    const sortDir = getSort('desc')

    expect(sortDir).to.equal('desc')
  })
})
