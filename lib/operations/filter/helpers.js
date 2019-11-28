'use strict'

const { isString, lt, gt, lte, gte, eq, includes, stubFalse, negate, identity } = require('lodash')
const jsep = require('jsep')
const minimatch = require('minimatch')

jsep.addBinaryOp('=~', 6)
jsep.addBinaryOp('=*', 6)
jsep.addBinaryOp('in', 6)

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
      if (!OP_MAP.hasOwnProperty(ast.callee.name)) {
        return stubFalse
      }

      const argFns = ast.arguments.map(getParseTree)

      return (node) => OP_MAP[ast.callee.name].apply(OP_MAP, argFns.map(fn => fn(node)))
    case 'LogicalExpression':
    case 'BinaryExpression':
      const left = getParseTree(ast.left)
      const right = getParseTree(ast.right)

      switch (ast.operator) {
        case '&&':
          return (node) => left(node) && right(node)
        case '||':
          return (node) => left(node) || right(node)
        case '==':
        case '===':
          return (node) => left(node) === right(node)
        case '<':
          return (node) => left(node) < right(node)
        case '>':
          return (node) => left(node) > right(node)
        case '<=':
          return (node) => left(node) <= right(node)
        case '>=':
          return (node) => left(node) >= right(node)
        case 'in':
          return (node) => OP_MAP.in(left(node), right(node))
        case '=~':
          return (node) => OP_MAP.regx(left(node), right(node))
        case '=*':
          return (node) => OP_MAP.glob(left(node), right(node))
        default:
          return stubFalse
      }
    case 'UnaryExpression':
      return (ast.operator === '!') ? negate(getParseTree(ast.argument)) : stubFalse
    case 'ThisExpression':
      return identity
  }
}

const OP_MAP = Object.freeze({
  eq,
  lt,
  gt,
  lte,
  gte,
  'in': (needle, haystack) => includes(haystack, needle),
  glob: (str, pattern) => isString(pattern) && isString(str) && minimatch(str, pattern),
  regx: (str, pattern) => {
    if (isString(pattern) && isString(str)) {
      try {
        const regex = new RegExp(pattern)

        return regex.test(str)
      } catch (e) {}
    }

    return false
  },
  all: function (op, arr, val) {
    return this.hasOwnProperty(op) && Array.isArray(arr) && arr.every(el => this[op](el, val))
  },
  any: function (op, arr, val) {
    return this.hasOwnProperty(op) && Array.isArray(arr) && arr.some(el => this[op](el, val))
  }
})
exports.OP_MAP = OP_MAP

exports.filter = function filter (nodes, filterExpr) {
  const ast = jsep(filterExpr)
  const filterFn = getParseTree(ast)

  return nodes.filter(filterFn)
}

exports.jsep = jsep
