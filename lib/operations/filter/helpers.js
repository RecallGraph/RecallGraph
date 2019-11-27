'use strict'

const { isString, lt, gt, lte, gte, eq, includes } = require('lodash')
const jsep = require('jsep')
const minimatch = require('minimatch')

jsep.addBinaryOp('=~', 6)
jsep.addBinaryOp('=*', 6)
jsep.addBinaryOp('in', 6)

// noinspection JSUnusedGlobalSymbols
const OP_MAP = {
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

exports.filter = function filter (nodes, filterExpr) {
  const ast = jsep(filterExpr)

  return nodes.filter(node => FILTER_MAP[ast.type](ast, node))
}

exports.jsep = jsep
