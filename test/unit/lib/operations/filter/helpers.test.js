/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/init')
const { filter } = require('../../../../../lib/operations/filter/helpers')
const { lt, gt, lte, gte, isEqual: eq, get } = require('lodash')

describe('Filter Helpers - filter', () => {
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

    filterExpr = 'in(x, [1, 2, 3])'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => [1, 2, 3].includes(node.x))

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'in(x, [y])'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = [nodes[4]]

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'in(x, 2)'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = 'typeof(x) === "number"'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => typeof node.x === 'number')

    expect(filteredNodes).to.deep.equal(expectedNodes)

    filterExpr = 'typeof(x) === "object"'
    filteredNodes = filter(nodes, filterExpr)
    expectedNodes = nodes.filter(node => typeof node.x === 'object')

    expect(filteredNodes).to.deep.equal(expectedNodes)

    nodes = [{ x: 'abc', y: 2 }, { x: 1 }, { y: 1 }, { x: 'aabbcc' }]

    filterExpr = 'glob(x, "*bc")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'glob(x, "ab*")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'glob(x, "*bc*")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = 'glob(x, "*ab{c,bc*,d}")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = 'glob(y, "*bc")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = 'glob(x, 1)'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = 'regx(x, ".*bc$")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'regx(x, "^ab.*")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'regx(x, ".*bc.*")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = 'regx(x, "^a?ab[bcd]+")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = 'regx(y, ".*bc")'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = 'regx(x, 1)'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    nodes = [{ x: [1, 2, 3], y: 1 }, { x: 1 }, { y: 1 }, { x: [4, 5, 6] }]

    filterExpr = 'all("in", x, [1, 2, 3, 4])'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'all("foo", x, [1, 2, 3, 4])'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty

    filterExpr = 'any("in", x, [1, 2, 3, 4])'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0], nodes[3]])

    filterExpr = 'any("foo", x, [1, 2, 3, 4])'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.be.empty
  })

  it('should filter on a single LogicalExpression', () => {
    const nodes = [{ x: { z: 1 }, y: 1 }, { x: { z: 0 }, y: 1 }, { x: 2, y: 1 }, { y: 1 }]

    let filterExpr = 'x == 2 && y > 0'
    let filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[2]])

    filterExpr = 'x == 2 || x.z >= 0'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal(nodes.slice(0, 3))

    filterExpr = 'typeof(x.z) == "undefined" ^ y == 1'
    filteredNodes = filter(nodes, filterExpr)
    let expectedNodes = nodes.filter(node => get(node, 'x.z') === undefined ^ node.y === 1)

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

    filterExpr = 'typeof(x) == "number" && -x == -2'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[2]])

    filterExpr = 'typeof(x) == "number" && ~x == -3'
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

    let filterExpr = '(typeof(x) == "object") ? (x.z == y) : (x == 2)'
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

    filterExpr = 'x.z < Math.PI'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal(nodes.slice(0, 2))

    filterExpr = 'x.z == Math.round(Math.tan(Math.PI / 4))'
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

    filterExpr = 'typeof(y) == "number" && (y | 1) == 3'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'typeof(y) == "number" && (y & 1) == 0'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'typeof(y) == "number" && (y << 1) == 4'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'typeof(y) == "number" && (y >> 1) == 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'typeof(y) == "number" && (y + y) == 4'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'typeof(y) == "number" && (y - 1) == 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'typeof(y) == "number" && (y * y) == 4'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'typeof(y) == "number" && (y / 2) == 1'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'typeof(y) == "number" && (y % 2) == 0'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])

    filterExpr = 'typeof(y) == "number" && (y ** 2) == 4'
    filteredNodes = filter(nodes, filterExpr)

    expect(filteredNodes).to.deep.equal([nodes[0]])
  })
})
