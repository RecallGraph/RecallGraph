'use strict'

const {
  random, sampleSize, mapValues, sample, pick, isFunction, toString, omitBy, isNil, defaults, isObject, escapeRegExp,
  isEqual
} = require('lodash')
const { format } = require('util')
const minimatch = require('minimatch')
const show = require('../../../lib/operations/show')
const { cartesian } = require('../event')
const { expect } = require('chai')
// noinspection JSUnresolvedVariable
const { baseUrl } = module.context
const request = require('@arangodb/request')
const { filter: filterHandler } = require('../../../lib/handlers/filterHandlers')
const { jsep, OP_MAP } = require('../../../lib/operations/filter/helpers')

const OPS = {
  primitive: [
    {
      key: 'eq',
      template: ['eq(%s, %j)', '%s == %j', '%s === %j']
    },
    {
      key: 'lt',
      template: ['lt(%s, %j)', '%s < %j']
    },
    {
      key: 'gt',
      template: ['gt(%s, %j)', '%s > %j']
    },
    {
      key: 'lte',
      template: ['lte(%s, %j)', '%s <= %j']
    },
    {
      key: 'gte',
      template: ['gte(%s, %j)', '%s >= %j']
    }
  ],
  collection: [
    {
      key: 'in',
      template: ['in(%s, %j)', '%s in %j']
    },
    {
      key: 'glob',
      template: ['glob(%s, "%s")', '%s =* "%s"'],
      preprocess: getPrefixPattern
    },
    {
      key: 'regx',
      template: ['regx(%s, "%s")', '%s =~ "%s"'],
      preprocess: (arr) => escapeRegExp(minimatch.makeRe(getPrefixPattern(arr)).source)
    }
  ]
}

// noinspection JSUnusedGlobalSymbols
const FILTER_MAP = {
  Identifier: (ast, node) => node[ast.name],
  Literal: ast => ast.value,
  MemberExpression: function (ast, node) {
    const member = this[ast.object.type](ast.object, node) || {}

    return ast.computed ? member[this[ast.property.type](ast.property, node)] : this[ast.property.type](ast.property,
      member)
  },
  ArrayExpression: function (ast, node) {
    return ast.elements.map(el => this[el.type](el, node))
  },
  CallExpression: function (ast, node) {
    return OP_MAP.hasOwnProperty(ast.callee.name) && OP_MAP[ast.callee.name].apply(OP_MAP,
      ast.arguments.map(arg => this[arg.type](arg, node)))
  },
  /**
   * @return {boolean}
   */
  LogicalExpression: function (ast, node) {
    switch (ast.operator) {
      case '&&':
        return this[ast.left.type](ast.left, node) && this[ast.right.type](ast.right, node)
      case '||':
        return this[ast.left.type](ast.left, node) || this[ast.right.type](ast.right, node)
      default:
        return false
    }
  },
  /**
   * @return {boolean}
   */
  UnaryExpression: function (ast, node) {
    return (ast.operator === '!') ? !this[ast.argument.type](ast.argument, node) : false
  },
  ThisExpression: (ast, node) => node,
  /**
   * @return {boolean}
   */
  BinaryExpression: function (ast, node) {
    switch (ast.operator) {
      case '==':
      case '===':
        return this[ast.left.type](ast.left, node) === this[ast.right.type](ast.right, node)
      case '<':
        return this[ast.left.type](ast.left, node) < this[ast.right.type](ast.right, node)
      case '>':
        return this[ast.left.type](ast.left, node) > this[ast.right.type](ast.right, node)
      case '<=':
        return this[ast.left.type](ast.left, node) <= this[ast.right.type](ast.right, node)
      case '>=':
        return this[ast.left.type](ast.left, node) >= this[ast.right.type](ast.right, node)
      case 'in':
        return OP_MAP.in(this[ast.left.type](ast.left, node), this[ast.right.type](ast.right, node))
      case '=~':
        return OP_MAP.regx(this[ast.left.type](ast.left, node), this[ast.right.type](ast.right, node))
      case '=*':
        return OP_MAP.glob(this[ast.left.type](ast.left, node), this[ast.right.type](ast.right, node))
    }
  }
}

function getPrefixPattern (arr1) {
  const arr = arr1.map(toString).sort()
  let a1 = arr[0]
  let a2 = arr[arr.length - 1]
  let L = a1.length
  let i = 0
  while (i < L && a1.charAt(i) === a2.charAt(i)) {
    i++
  }
  return `${a1.substring(0, i)}*`
}

function generateGrouping (filterArr) {
  for (let i = 0; i < filterArr.length - 2; i++) {
    if (random()) {
      const left = random(0, filterArr.length - 2)
      const right = random(left + 1, filterArr.length - 1)
      const invert = random()

      filterArr[left] = (invert ? '!(' : '(') + filterArr[left]
      filterArr[right] += ')'
    }
  }
}

function generateFilters (nodes) {
  const fieldBags = nodes.reduce((acc, node) => {
    for (const field in node) {
      if (!acc[field]) {
        acc[field] = new Set()
      }
      acc[field].add(node[field])
    }

    return acc
  }, {})

  const fbKeys = Object.keys(fieldBags)
  const ss = random(1, fbKeys.length)
  const sampleFieldBags = pick(fieldBags, sampleSize(fbKeys, ss))
  const sampleFieldBagSubsets = mapValues(sampleFieldBags, (values) => {
    const ss = random(1, values.size)

    return sampleSize(Array.from(values), ss)
  })

  const filterArr = []
  for (const field in sampleFieldBagSubsets) {
    const selectPrimitive = random()
    const filterSet = selectPrimitive ? 'primitive' : 'collection'
    const value = selectPrimitive ? sample(sampleFieldBagSubsets[field]) : sampleFieldBagSubsets[field]
    const filter = sample(OPS[filterSet])
    const operand2 = isFunction(filter.preprocess) ? filter.preprocess(value) : value
    const template = Array.isArray(filter.template) ? sample(filter.template) : filter.template
    const fmtFilter = format(template, `this["${field}"]`, operand2)
    const invert = random()

    filterArr.push(invert ? `!(${fmtFilter})` : fmtFilter)
  }

  generateGrouping(filterArr)

  for (let i = filterArr.length - 1; i > 0; i--) {
    const operator = random(0, 3) ? '||' : '&&'
    filterArr.splice(i, 0, operator)
  }

  return filterArr.join(' ')
}

exports.testNodes = function testNodes (pathParam, rawPath, timestamp, filterFn) {
  const sort = ['asc', 'desc']
  const preSkip = [0, 1]
  const preLimit = [0, 1]

  const combos = cartesian({ sort, preSkip, preLimit })
  combos.forEach(combo => {
    const allNodes = show(rawPath, timestamp, { sort: combo.sort, skip: combo.preSkip, limit: combo.preLimit })

    // noinspection JSUnresolvedVariable
    if (allNodes.length) {
      const filterExpr = generateFilters(allNodes)

      const filteredNodes = filterFn(pathParam, timestamp, filterExpr, combo)

      expect(filteredNodes).to.be.an.instanceOf(Array)

      const ast = jsep(filterExpr)
      // noinspection JSUnresolvedFunction
      const expectedNodes = allNodes.filter(node => FILTER_MAP[ast.type](ast, node))

      if (!isEqual(filteredNodes, expectedNodes)) {
        console.error({ rawPath, timestamp, filterExpr, combo, ast, filteredNodes, expectedNodes })

        expect.fail(filteredNodes, expectedNodes)
      }
    }
  })
}

exports.filterPostWrapper = function filterPostWrapper (reqParams, timestamp, filterExpr, combo) {
  defaults(reqParams, { qs: {}, body: {} })
  reqParams.qs.timestamp = timestamp
  reqParams.body.filter = filterExpr

  if (isObject(combo)) {
    Object.assign(reqParams.qs, omitBy(combo, isNil))
  }

  const response = request.post(`${baseUrl}/history/filter`, reqParams)

  expect(response).to.be.an.instanceOf(Object)
  expect(response.statusCode, response.body).to.equal(200)

  return JSON.parse(response.body)
}

exports.filterHandlerWrapper = function filterHandlerWrapper (pathParam, timestamp, filterExpr, combo) {
  defaults(pathParam, { queryParams: {}, body: {} })
  pathParam.queryParams.timestamp = timestamp
  pathParam.body.filter = filterExpr

  if (isObject(combo)) {
    Object.assign(pathParam.queryParams, combo)
  }

  return filterHandler(pathParam)
}
