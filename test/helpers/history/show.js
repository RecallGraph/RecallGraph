'use strict'

const jiff = require('jiff')
const { expect } = require('chai')
const request = require('@arangodb/request')
const { range, chain, sortBy, isObject, omitBy, isNil, isEqual, differenceWith, isEmpty } = require('lodash')
const diff = require('../../../lib/operations/diff')
const { getRandomSubRange, cartesian, generateFilters } = require('../util')
const { show: showHandler } = require('../../../lib/handlers/showHandlers')
const { filter, getCollTypes } = require('../../../lib/operations/helpers')

function compareNodes (nodes, expectedNodes, param) {
  if (nodes.length !== expectedNodes.length) {
    console.debug({
      actual: differenceWith(nodes, expectedNodes, isEqual),
      expected: differenceWith(expectedNodes, nodes, isEqual)
    })
  }

  expect(nodes.length, param).to.equal(expectedNodes.length)
  expect(nodes[0], param).to.deep.equal(expectedNodes[0])

  for (let i = 1; i < expectedNodes.length; i++) {
    const node = nodes[i]
    const expectedNode = expectedNodes[i]

    expect(node, param).to.be.an.instanceOf(Object)
    expect(node._id, param).to.equal(expectedNode._id)
    expect(node._rev, param).to.equal(expectedNode._rev)
  }
}

function compareGroupedNodes (nodeGroups, expectedNodeGroups, param, combo) {
  if (nodeGroups.length !== expectedNodeGroups.length) {
    console.debug({
      actual: differenceWith(nodeGroups, expectedNodeGroups, isEqual),
      expected: differenceWith(expectedNodeGroups, nodeGroups, isEqual)
    })
  }

  const {
    groupBy: gb,
    countsOnly: co
  } = combo

  expect(nodeGroups.length, param).to.equal(expectedNodeGroups.length)

  const aggrField = co ? 'total' : 'nodes'
  nodeGroups.forEach((nodeGroup, idx1) => {
    expect(nodeGroup, param).to.be.an.instanceOf(Object)
    expect(nodeGroup[gb], param).to.equal(expectedNodeGroups[idx1][gb])

    expect(nodeGroup, param).to.have.property(aggrField)
    if (co) {
      expect(nodeGroup[aggrField], param).to.equal(expectedNodeGroups[idx1][aggrField])
    } else {
      expect(nodeGroup[aggrField], param).to.be.an.instanceOf(Array)
      expect(nodeGroup[aggrField].length, param).to.equal(expectedNodeGroups[idx1][aggrField].length)

      if (nodeGroup[aggrField].length > 0) {
        expect(nodeGroup[aggrField][0], param).to.deep.equal(expectedNodeGroups[idx1][aggrField][0])
        nodeGroup[aggrField].forEach((node, idx2) => {
          expect(node, param).to.be.an.instanceOf(Object)
          expect(node._id, param).to.equal(expectedNodeGroups[idx1][aggrField][idx2]._id)
          expect(node._rev, param).to.equal(expectedNodeGroups[idx1][aggrField][idx2]._rev)
        })
      }
    }
  })
}

function showRequestWrapper (reqParams, combo, method = 'get') {
  if (isObject(combo)) {
    Object.assign(reqParams.qs, omitBy(combo, isNil))
  }

  const response = request[method](`${module.context.baseUrl}/history/show`, reqParams)

  expect(response).to.be.an.instanceOf(Object)
  expect(response.statusCode).to.equal(200)

  return JSON.parse(response.body)
}

function showHandlerWrapper (req, combo) {
  if (isObject(combo)) {
    Object.assign(req.queryParams, omitBy(combo, isNil))
  }

  return showHandler(req)
}

// Public
function testUngroupedNodes (pathParam, timestamp, allNodes, expectedNodes, showFn) {
  expect(allNodes).to.deep.equal(expectedNodes)

  const absoluteSliceRange = getRandomSubRange(expectedNodes)
  const relativeSliceRange = getRandomSubRange(range(1, absoluteSliceRange[1] - absoluteSliceRange[0]))
  const skip = [0, relativeSliceRange[0]]
  const limit = [0, relativeSliceRange[1]]
  const sort = ['asc', 'desc']
  const groupBy = [null]
  const countsOnly = [false]
  const groupSort = ['asc', 'desc']
  const groupSkip = [0, 1]
  const groupLimit = [0, 2]
  const combos = cartesian({
    skip,
    limit,
    sort,
    groupBy,
    countsOnly,
    groupSort,
    groupSkip,
    groupLimit
  })

  combos.forEach(combo => {
    let nodes = showFn(pathParam, timestamp, combo)

    expect(nodes).to.be.an.instanceOf(Array)

    const sortedNodes = (combo.sort === 'desc') ? expectedNodes.slice().reverse() : expectedNodes

    let slicedSortedNodes
    let start = 0
    let end = 0
    if (combo.limit) {
      start = combo.skip
      end = start + combo.limit
      slicedSortedNodes = sortedNodes.slice(start, end)
    } else {
      slicedSortedNodes = sortedNodes
    }

    let param = JSON.stringify({ pathParam, timestamp, combo })
    compareNodes(nodes, slicedSortedNodes, param)

    const postFilter = generateFilters(nodes)
    if (!isEmpty(postFilter)) {
      combo.postFilter = postFilter
      nodes = showFn(pathParam, timestamp, combo)
      const filteredSlicedSortedNodes = filter(slicedSortedNodes, postFilter)
      param = JSON.stringify({ pathParam, timestamp, combo })
      compareNodes(nodes, filteredSlicedSortedNodes, param)
    }
  })
}

function testGroupedNodes (path, timestamp, showFn) {
  const sort = ['asc', 'desc']
  const skip = [0, 1]
  const limit = [0, 2]
  const groupBy = ['collection', 'type']
  const countsOnly = [false, true]
  const groupSort = ['asc', 'desc']
  const groupSkip = [0, 1]
  const groupLimit = [0, 2]
  const collTypes = getCollTypes()
  const ungroupedExpectedNodes = buildNodesFromEventLog(path, timestamp)

  const combos = cartesian({
    skip,
    limit,
    sort,
    groupBy,
    countsOnly,
    groupSort,
    groupSkip,
    groupLimit
  })
  combos.forEach(combo => {
    let nodeGroups = showFn(path, timestamp, combo)

    expect(nodeGroups).to.be.an.instanceOf(Array)

    const {
      skip: skp,
      limit: lmt,
      sort: st,
      groupBy: gb,
      countsOnly: co,
      groupSort: gst,
      groupSkip: gskp,
      groupLimit: glmt
    } = combo

    let expectedNodesWrapper = chain(ungroupedExpectedNodes)

    if (co) {
      expectedNodesWrapper = expectedNodesWrapper.groupBy(item => {
        const collName = item._id.split('/')[0]
        return gb === 'collection' ? collName : collTypes[collName]
      })
        .map((nodes, group) => ({
          [gb]: group,
          total: nodes.length
        }))
        .sortBy(group => st === 'desc' ? -group.total : group.total, gb)
    } else {
      expectedNodesWrapper = expectedNodesWrapper.groupBy(item => {
        const collName = item._id.split('/')[0]
        return gb === 'collection' ? collName : collTypes[collName]
      })
        .map((nodes, group) => ({
          [gb]: group,
          nodes
        }))
        .sortBy(gb)
        .tap(arr => {
          if (st === 'desc') {
            arr.reverse()
          }
        })
    }

    expectedNodesWrapper = expectedNodesWrapper.thru(arr => {
      if (lmt) {
        const start = skp
        const end = start + lmt

        return arr.slice(start, end)
      }

      return arr
    })

    if (!co) {
      expectedNodesWrapper = expectedNodesWrapper.map(group => {
        const nodes = group.nodes
        let sorted = sortBy(nodes, node => node._id)
        if (gst === 'desc') {
          sorted.reverse()
        }
        if (glmt) {
          const start = gskp
          const end = start + glmt
          sorted = sorted.slice(start, end)
        }
        group.nodes = sorted

        return group
      })
    }

    const expectedNodeGroups = expectedNodesWrapper.value()
    let param = JSON.stringify({ path, timestamp, combo })
    compareGroupedNodes(nodeGroups, expectedNodeGroups, param, combo)

    const postFilter = generateFilters(nodeGroups)
    if (postFilter) {
      combo.postFilter = postFilter
      nodeGroups = showFn(path, timestamp, combo)
      const filteredNodeGroups = filter(expectedNodeGroups, postFilter)
      param = JSON.stringify({ path, timestamp, combo })
      compareGroupedNodes(nodeGroups, filteredNodeGroups, param, combo)
    }
  })
}

function buildNodesFromEventLog (path, timestamp) {
  return diff(path, { until: timestamp, postFilter: 'last(events).event !== "deleted"' })
    .map(item => {
      let node = {}

      for (let c of item.commands) {
        // noinspection JSCheckFunctionSignatures
        node = jiff.patch(c, node, {})
      }

      return node
    })
}

function showGetWrapper (path, timestamp, combo = {}) {
  const reqParams = {
    json: true,
    qs: {
      path
    }
  }
  combo.timestamp = timestamp

  return showRequestWrapper(reqParams, combo)
}

function showPostWrapper (path, timestamp, combo = {}) {
  const reqParams = {
    json: true,
    qs: {},
    body: {
      path
    }
  }
  combo.timestamp = timestamp

  return showRequestWrapper(reqParams, combo, 'post')
}

function showHandlerQueryWrapper (path, timestamp, combo = {}) {
  const req = {
    queryParams: {
      path
    }
  }
  combo.timestamp = timestamp

  return showHandlerWrapper(req, combo)
}

function showHandlerBodyWrapper (path, timestamp, combo = {}) {
  const req = {
    queryParams: {},
    body: {
      path
    }
  }
  combo.timestamp = timestamp

  return showHandlerWrapper(req, combo)
}

module.exports = {
  testUngroupedNodes,
  testGroupedNodes,
  buildNodesFromEventLog,
  showGetWrapper,
  showPostWrapper,
  showHandlerQueryWrapper,
  showHandlerBodyWrapper
}
