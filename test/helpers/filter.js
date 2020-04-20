'use strict'

const {
  random, sampleSize, mapValues, sample, pick, isFunction, toString, escapeRegExp, isObject
} = require('lodash')
const _ = require('lodash')
const { format } = require('util')
const minimatch = require('minimatch')
const { getAST, OP_MAP } = require('../../lib/operations/helpers')

const CALLEE_MAP = {
  $_: _,
  $RG: OP_MAP
}
const OPS = {
  primitive: [
    {
      key: 'eq',
      template: ['$_.eq(%s, %j)', '%s == %j', '%s === %j']
    },
    {
      key: 'lt',
      template: ['$_.lt(%s, %j)', '%s < %j']
    },
    {
      key: 'gt',
      template: ['$_.gt(%s, %j)', '%s > %j']
    },
    {
      key: 'lte',
      template: ['$_.lte(%s, %j)', '%s <= %j']
    },
    {
      key: 'gte',
      template: ['$_.gte(%s, %j)', '%s >= %j']
    }
  ],
  collection: [
    {
      key: 'in',
      template: ['$_.rearg($_.includes, [1, 0])(%s, %j)', '%s in %j']
    },
    {
      key: 'glob',
      template: ['$RG.glob(%s, "%s")', '%s =* "%s"'],
      preprocess: getPrefixPattern
    },
    {
      key: 'regx',
      template: ['$RG.regx(%s, "%s")', '%s =~ "%s"'],
      preprocess: (arr) => escapeRegExp(minimatch.makeRe(getPrefixPattern(arr)).source)
    }
  ]
}

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
    const callee = CALLEE_MAP[ast.callee.object.name]

    return callee.hasOwnProperty(ast.callee.property.name) && callee[ast.callee.property.name].apply(callee,
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
        return this[ast.left.type](ast.left, node) in this[ast.right.type](ast.right, node)
      case '=~':
        return OP_MAP.regx(this[ast.left.type](ast.left, node), this[ast.right.type](ast.right, node))
      case '=*':
        return OP_MAP.glob(this[ast.left.type](ast.left, node), this[ast.right.type](ast.right, node))
    }
  }
}

function getPrefixPattern (arr1) {
  const arr = arr1.map(toString)
    .sort()
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

function getType (input) {
  if (isObject(input)) {
    if (Array.isArray(input)) {
      return 'array'
    } else {
      return 'object'
    }
  } else if (input == null) {
    return 'null'
  } else {
    return typeof input
  }
}

function mergeData (input, data, rootPath = '') {
  const type = getType(input)

  switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'null':
      if (!data[rootPath]) {
        data[rootPath] = new Set()
      }

      data[rootPath].add(input)
      break

    case 'object':
      for (const field in input) {
        const currentPath = `${rootPath}['${field}']`
        const val = input[field]

        mergeData(val, data, currentPath)
      }
      break

    case 'array':
      for (let i = 0; i < input.length; i++) {
        const currentPath = `${rootPath}['${i}']`
        const val = input[i]

        mergeData(val, data, currentPath)
      }
  }
}

function generateFilters (nodes) {
  const fieldBags = {}

  for (const node of nodes) {
    mergeData(node, fieldBags)
  }

  const fbKeys = Object.keys(fieldBags)
  const ss = random(1, fbKeys.length)
  const sampleFieldBags = pick(fieldBags, sampleSize(fbKeys, ss))
  const sampleFieldBagSubsets = mapValues(sampleFieldBags, (values) => {
    const ss = random(1, 10)

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
    const fmtFilter = format(template, `this${field}`, operand2)
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

exports.generateFilters = generateFilters

exports.filter = function filter (arr, filterExpr) {
  const ast = getAST(filterExpr)

  return arr.filter(item => FILTER_MAP[ast.type](ast, item))
}
