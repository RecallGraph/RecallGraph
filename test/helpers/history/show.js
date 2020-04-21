'use strict'

const { range, chain, sortBy, isObject, omitBy, isNil } = require('lodash')
const request = require('@arangodb/request')
const { baseUrl } = module.context
const { expect } = require('chai')
const { show: showHandler } = require('../../../lib/handlers/showHandlers')
const log = require('../../../lib/operations/log')
const { getRandomSubRange, cartesian } = require('../event')
const jiff = require('jiff')
const { generateFilters } = require('../filter')
const { filter, getCollTypes } = require('../../../lib/operations/helpers')

exports.testUngroupedNodes = function testUngroupedNodes (
  pathParam,
  timestamp,
  allNodes,
  expectedNodes,
  showFn
) {
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
  const postFilter = [null, generateFilters(allNodes)]
  const combos = cartesian({
    skip,
    limit,
    sort,
    groupBy,
    countsOnly,
    groupSort,
    groupSkip,
    groupLimit,
    postFilter
  })

  combos.forEach(combo => {
    const nodes = showFn(pathParam, timestamp, combo)

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

    let filteredSlicedSortedNodes
    if (combo.postFilter) {
      filteredSlicedSortedNodes = filter(slicedSortedNodes, combo.postFilter)
    } else {
      filteredSlicedSortedNodes = slicedSortedNodes
    }

    expect(nodes.length).to.equal(filteredSlicedSortedNodes.length)
    expect(nodes[0]).to.deep.equal(filteredSlicedSortedNodes[0])

    for (let i = 1; i < filteredSlicedSortedNodes.length; i++) {
      const node = nodes[i]
      const expectedNode = filteredSlicedSortedNodes[i]

      expect(node).to.be.an.instanceOf(Object)
      expect(node._id).to.equal(expectedNode._id)
      expect(node._rev).to.equal(expectedNode._rev)
    }
  })
}

exports.testGroupedNodes = function testGroupedNodes (
  path,
  timestamp,
  showFn
) {
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
  const postFilter = [null, generateFilters(ungroupedExpectedNodes)]

  const combos = cartesian({
    skip,
    limit,
    sort,
    groupBy,
    countsOnly,
    groupSort,
    groupSkip,
    groupLimit,
    postFilter
  })
  combos.forEach(combo => {
    const nodeGroups = showFn(path, timestamp, combo)

    expect(nodeGroups).to.be.an.instanceOf(Array)

    const {
      skip: skp,
      limit: lmt,
      sort: st,
      groupBy: gb,
      countsOnly: co,
      groupSort: gst,
      groupSkip: gskp,
      groupLimit: glmt,
      postFilter: pf
    } = combo

    let unfilteredNodesWrapper = chain(ungroupedExpectedNodes)

    if (co) {
      unfilteredNodesWrapper = unfilteredNodesWrapper.groupBy(item => {
        const collName = item._id.split('/')[0]
        return gb === 'collection' ? collName : collTypes[collName]
      })
        .map((nodes, group) => ({
          [gb]: group,
          total: nodes.length
        }))
        .sortBy(group => st === 'desc' ? -group.total : group.total, gb)
    } else {
      unfilteredNodesWrapper = unfilteredNodesWrapper.groupBy(item => {
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

    unfilteredNodesWrapper = unfilteredNodesWrapper.thru(arr => {
      if (lmt) {
        const start = skp
        const end = start + lmt

        return arr.slice(start, end)
      }

      return arr
    })

    if (!co) {
      unfilteredNodesWrapper = unfilteredNodesWrapper.map(group => {
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

    const unfilteredNodeGroups = unfilteredNodesWrapper.value()
    let filteredNodeGroups
    if (pf) {
      filteredNodeGroups = filter(unfilteredNodeGroups, pf)
    } else {
      filteredNodeGroups = unfilteredNodeGroups
    }

    const params = JSON.stringify({ rawPath: path, timestamp, combo })

    expect(nodeGroups.length, params).to.equal(filteredNodeGroups.length)

    const aggrField = co ? 'total' : 'nodes'
    nodeGroups.forEach((nodeGroup, idx1) => {
      expect(nodeGroup, params).to.be.an.instanceOf(Object)
      expect(nodeGroup[gb], params).to.equal(filteredNodeGroups[idx1][gb])

      expect(nodeGroup, params).to.have.property(aggrField)
      if (co) {
        expect(nodeGroup[aggrField], params).to.equal(filteredNodeGroups[idx1][aggrField])
      } else {
        expect(nodeGroup[aggrField], params).to.be.an.instanceOf(Array)
        expect(nodeGroup[aggrField].length, params).to.equal(filteredNodeGroups[idx1][aggrField].length)

        if (nodeGroup[aggrField].length > 0) {
          expect(nodeGroup[aggrField][0], params).to.deep.equal(filteredNodeGroups[idx1][aggrField][0])
          nodeGroup[aggrField].forEach((node, idx2) => {
            expect(node, params).to.be.an.instanceOf(Object)
            expect(node._id, params).to.equal(filteredNodeGroups[idx1][aggrField][idx2]._id)
            expect(node._rev, params).to.equal(filteredNodeGroups[idx1][aggrField][idx2]._rev)
          })
        }
      }
    })
  })
}

function buildNodesFromEventLog (path, timestamp) {
  const events = log(path, { until: timestamp, groupBy: 'node', groupSort: 'asc', returnCommands: true })
  const diffs = events.filter(item => item.events[item.events.length - 1].event !== 'deleted')
    .map(item => item.events.map(event => event.command))

  return diffs.map(commands => {
    let node = {}

    for (let c of commands) {
      node = jiff.patch(c, node, {})
    }

    return node
  })
}

exports.buildNodesFromEventLog = buildNodesFromEventLog

function showRequestWrapper (reqParams, combo, method = 'get') {
  if (isObject(combo)) {
    Object.assign(reqParams.qs, omitBy(combo, isNil))
  }

  const response = request[method](`${baseUrl}/history/show`, reqParams)

  expect(response).to.be.an.instanceOf(Object)
  expect(response.statusCode).to.equal(200)

  return JSON.parse(response.body)
}

exports.showGetWrapper = function showGetWrapper (path, timestamp, combo) {
  const reqParams = {
    json: true,
    qs: {
      path
    }
  }
  combo.timestamp = timestamp

  return showRequestWrapper(reqParams, combo)
}

exports.showPostWrapper = function showPostWrapper (path, timestamp, combo) {
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

function showHandlerWrapper (req, combo) {
  if (isObject(combo)) {
    Object.assign(req.queryParams, omitBy(combo, isNil))
  }

  return showHandler(req)
}

exports.showHandlerQueryWrapper = function showHandlerQueryWrapper (path, timestamp, combo) {
  const req = {
    queryParams: {
      path
    }
  }
  combo.timestamp = timestamp

  return showHandlerWrapper(req, combo)
}

exports.showHandlerBodyWrapper = function showHandlerBodyWrapper (path, timestamp, combo) {
  const req = {
    queryParams: {},
    body: {
      path
    }
  }
  combo.timestamp = timestamp

  return showHandlerWrapper(req, combo)
}
