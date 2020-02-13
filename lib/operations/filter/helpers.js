'use strict'

const { isString, lt, gt, lte, gte, isEqual: eq, stubFalse, negate, identity, get, constant } = require('lodash')
const jsep = require('jsep')
const minimatch = require('minimatch')

jsep.addBinaryOp('=~', 6)
jsep.addBinaryOp('=*', 6)
jsep.addBinaryOp('in', 6)
jsep.addBinaryOp('**', 4)

function getParseTree (ast) {
  switch (ast.type) {
    case 'Identifier':
      return (node) => node[ast.name]
    case 'Literal':
      return () => ast.value
    case 'MemberExpression':
      if (eq(ast.object, { type: 'Identifier', name: 'Math' })) {
        return constant(Math[ast.property.name])
      }

      const memberFn = (node) => (getParseTree(ast.object)(node) || {})
      const propertyFn = getParseTree(ast.property)

      return ast.computed ? (node) => memberFn(node)[propertyFn(node)] : (node) => propertyFn(memberFn(node))
    case 'ArrayExpression':
      const fnArr = ast.elements.map(getParseTree)

      return (node) => fnArr.map(fn => fn(node))
    case 'CallExpression':
      const argFns = ast.arguments.map(getParseTree)

      if (OP_MAP.hasOwnProperty(ast.callee.name)) {
        return (node) => OP_MAP[ast.callee.name].apply(OP_MAP, argFns.map(fn => fn(node)))
      } else if (get(ast, 'callee.object.name') === 'Math' && Math.hasOwnProperty(get(ast, 'callee.property.name'))) {
        return (node) => Math[ast.callee.property.name].apply(Math, argFns.map(fn => fn(node)))
      } else {
        return stubFalse
      }

    case 'LogicalExpression':
    case 'BinaryExpression':
      const left = getParseTree(ast.left)
      const right = getParseTree(ast.right)

      switch (ast.operator) {
        case '==':
        case '===':
          return (node) => OP_MAP.eq(left(node), right(node))
        case '!=':
        case '!==':
          return (node) => !OP_MAP.eq(left(node), right(node))
        case '<':
          return (node) => OP_MAP.lt(left(node), right(node))
        case '>':
          return (node) => OP_MAP.gt(left(node), right(node))
        case '<=':
          return (node) => OP_MAP.lte(left(node), right(node))
        case '>=':
          return (node) => OP_MAP.gte(left(node), right(node))
        case 'in':
          return (node) => OP_MAP.in(left(node), right(node))
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

const OP_MAP = Object.freeze({
  eq,
  lt,
  gt,
  lte,
  gte,
  'typeof': (val) => typeof val,
  'in': (needle, haystack) => Array.isArray(haystack) && haystack.some(el => eq(needle, el)),
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
