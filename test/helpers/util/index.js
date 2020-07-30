'use strict'

const { format } = require('util')
const minimatch = require('minimatch')
const {
  random, sampleSize, sample, isFunction, toString, escapeRegExp, isObject, chain, isEmpty, pick, flatMap
} = require('lodash')

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
      template: ['rearg($_.includes, [1, 0])(%s, %j)', '%s in %j']
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

// Public
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

function generateFilters (nodes) {
  const fieldBags = {}

  for (const node of nodes) {
    mergeData(node, fieldBags)
  }

  const fbKeys = Object.keys(fieldBags)
  const ss = random(1, Math.min(10, fbKeys.length))
  const sampleFieldBagSubsets = chain(fieldBags)
    .pick(sampleSize(fbKeys, ss))
    .toPairs()
    .filter(pair => !isEmpty(pair[1]))
    .fromPairs()
    .mapValues(values => {
      const ss = random(1, Math.min(10, values.size))

      return sampleSize(Array.from(values), ss)
    })
    .value()

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

function cartesian (keyedArrays = {}) {
  const keys = Object.keys(keyedArrays)
  if (!keys.length) {
    return []
  }

  const headKey = keys[0]
  if (keys.length === 1) {
    return keyedArrays[headKey].map(val => ({ [headKey]: val }))
  } else {
    const head = keyedArrays[headKey]
    const tail = pick(keyedArrays, keys.slice(1))
    const tailCombos = cartesian(tail)

    return flatMap(tailCombos, tailItem =>
      head.map(headItem => Object.assign({ [headKey]: headItem }, tailItem))
    )
  }
}

function getRandomSubRange (objWithLength, maxLength = Number.POSITIVE_INFINITY) {
  if (objWithLength.length > 0) {
    const lower = random(0, objWithLength.length - 1)
    const upperIndexBound =
      (Number.isFinite(maxLength)
        ? Math.min(objWithLength.length, lower + maxLength)
        : objWithLength.length) - 1
    const upper = random(lower, upperIndexBound)

    return [lower, upper]
  }

  return []
}

module.exports = {
  getPrefixPattern,
  generateFilters,
  cartesian,
  getRandomSubRange
}
