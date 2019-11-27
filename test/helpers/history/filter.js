'use strict'

const {
  random, sampleSize, mapValues, includes, sample, pick, isFunction, toString, cloneDeep, isString, omitBy, isNil,
  defaults, isObject, escapeRegExp, isEqual
} = require('lodash')
const { format } = require('util')
const minimatch = require('minimatch')
const jsep = require('jsep')
const show = require('../../../lib/operations/show')
const { cartesian } = require('../event')
const { expect } = require('chai')
// noinspection JSUnresolvedVariable
const { baseUrl } = module.context
const request = require('@arangodb/request')
const { filter: filterHandler } = require('../../../lib/handlers/filterHandlers')

const OPS = {
  primitive: [
    {
      key: 'eq',
      template: ['eq(%s, "%s")', '%s == "%s"', '%s === "%s"'],
      comparator: (field, value) => (node) => node[field] === toString(value)
    },
    {
      key: 'lt',
      template: ['lt(%s, "%s")', '%s < "%s"'],
      comparator: (field, value) => (node) => node[field] < toString(value)
    },
    {
      key: 'gt',
      template: ['gt(%s, "%s")', '%s > "%s"'],
      comparator: (field, value) => (node) => node[field] > toString(value)
    },
    {
      key: 'lte',
      template: ['lte(%s, "%s")', '%s <= "%s"'],
      comparator: (field, value) => (node) => node[field] <= toString(value)
    },
    {
      key: 'gte',
      template: ['gte(%s, "%s")', '%s >= "%s"'],
      comparator: (field, value) => (node) => node[field] >= toString(value)
    }
  ],
  collection: [
    {
      key: 'in',
      template: ['in(%s, %j)', '%s in %j'],
      comparator: (field, arr) => (node) => includes(arr, node[field])
    },
    {
      key: 'glob',
      template: ['glob(%s, "%s")', '%s =* "%s"'],
      preprocess: getPrefixPattern,
      comparator: (field, value) => {
        const mm = new minimatch.Minimatch(value)

        return (node) => isString(node[field]) && mm.match(node[field])
      }
    },
    {
      key: 'regx',
      template: ['regx(%s, "%s")', '%s =~ "%s"'],
      preprocess: (arr) => minimatch.makeRe(getPrefixPattern(arr)).source,
      preprocessTemplate: (value) => escapeRegExp(value),
      comparator: (field, value) => {
        const regex = new RegExp(value)

        return (node) => isString(node[field]) && regex.test(node[field])
      }
    }
  ]
}

// noinspection JSUnusedGlobalSymbols
const FILTER_MAP_TEMPLATE = {
  /**
   * @return {boolean}
   */
  UnaryExpression: function (ast, node) {
    return (ast.operator === '!') ? !this[ast.argument.type](ast.argument, node) : false
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
  }
}

function getPrefixPattern (arr1) {
  const arr = arr1.map(toString).sort()
  let a1 = arr[0]; let a2 = arr[arr.length - 1]; let L = a1.length; let i = 0
  while (i < L && a1.charAt(i) === a2.charAt(i)) {
    i++
  }
  return `${a1.substring(0, i)}*`
}

function generateGrouping (filterArr, compArr) {
  for (let i = 0; i < filterArr.length - 2; i++) {
    if (random()) {
      const left = random(0, filterArr.length - 2)
      const right = random(left + 1, filterArr.length - 1)
      const invert = random()

      for (const arr of [filterArr, compArr]) {
        arr[left] = (invert ? '!(' : '(') + arr[left]
        arr[right] += ')'
      }
    }
  }
}

function getOpMap (compMap) {
  const opMap = cloneDeep(FILTER_MAP_TEMPLATE)
  opMap.CallExpression = (ast, node) => compMap[ast.callee.name](node)

  return opMap
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

  const filterArr = []; const compArr = []; const compMap = {}
  for (const field in sampleFieldBagSubsets) {
    const selectPrimitive = random()
    const filterSet = selectPrimitive ? 'primitive' : 'collection'
    const value = selectPrimitive ? sample(sampleFieldBagSubsets[field]) : sampleFieldBagSubsets[field]
    const filter = sample(OPS[filterSet])
    const operand2 = isFunction(filter.preprocess) ? filter.preprocess(value) : value
    const op2Template = isFunction(filter.preprocessTemplate) ? filter.preprocessTemplate(operand2) : operand2
    const op2Comp = isFunction(filter.preprocessComparator) ? filter.preprocessComparator(operand2) : operand2
    const template = Array.isArray(filter.template) ? sample(filter.template) : filter.template
    const fmtFilter = format(template, `this["${field}"]`, op2Template)
    const invert = random()

    filterArr.push(invert ? `!(${fmtFilter})` : fmtFilter)

    const fKey = `${filter.key}_${compArr.length}`
    compArr.push(invert ? `!(${fKey}())` : `${fKey}()`)
    compMap[fKey] = filter.comparator(field, op2Comp)
  }

  generateGrouping(filterArr, compArr)

  for (let i = filterArr.length - 1; i > 0; i--) {
    const operator = random(0, 3) ? '||' : '&&'
    filterArr.splice(i, 0, operator)
    compArr.splice(i, 0, operator)
  }

  const filterExpr = filterArr.join(' '); const compExpr = compArr.join(' ')
  const ast = jsep(compExpr)
  const opMap = getOpMap(compMap)

  return { filterExpr, ast, opMap }
}

exports.testNodes = function testNodes (pathParam, rawPath, timestamp, filterFn) {
  const sort = ['asc', 'desc']
  const preSkip = [0, 1]
  const preLimit = [0, 1]

  const combos = cartesian({ sort, preSkip, preLimit })
  combos.forEach(combo => {
    const allNodes = show(rawPath, timestamp, { sort: combo.sort, skip: combo.preSkip, limit: combo.preLimit })

    if (allNodes.length) {
      const { filterExpr, ast, opMap } = generateFilters(allNodes)

      const filteredNodes = filterFn(pathParam, timestamp, filterExpr, combo)

      expect(filteredNodes).to.be.an.instanceOf(Array)

      const expectedNodes = allNodes.filter(node => opMap[ast.type](ast, node))

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
