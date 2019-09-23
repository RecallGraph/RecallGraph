'use strict'

const {
  range,
  chain,
  sortBy
} = require('lodash')

// const request = require('@arangodb/request')
// noinspection JSUnresolvedVariable
// const { baseUrl } = module.context
const { expect } = require('chai')
// const { show: showHandler } = require('../../../lib/handlers/showHandlers')
const log = require('../../../lib/operations/log')
const { getCollTypes } = require('../../../lib/operations/show/helpers')
const { getRandomSubRange, cartesian } = require('.')
const jiff = require('jiff')

// exports.getRandomNonOriginEvent = function getRandomNonOriginEvent () {
//   const cursor = query`
//     for e in ${eventColl}
//       filter e['hops-from-origin'] > 0
//       sort rand()
//       limit 1
//     return e
//   `
//   const event = cursor.next()
//
//   cursor.dispose()
//
//   return event
// }

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

    expect(nodes.length).to.equal(slicedSortedNodes.length)
    expect(nodes[0]).to.deep.equal(slicedSortedNodes[0])

    for (let i = 1; i < slicedSortedNodes.length; i++) {
      const node = nodes[i]; const expectedNode = slicedSortedNodes[i]

      expect(node).to.be.an.instanceOf(Object)
      expect(node._id).to.equal(expectedNode._id)
      expect(node._rev).to.equal(expectedNode._rev)
    }
  })
}

exports.testGroupedNodes = function testGroupedNodes (
  pathParam,
  rawPath,
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
  const ungroupedExpectedNodes = buildNodesFromEventLog(rawPath, timestamp)

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
    const nodeGroups = showFn(pathParam, timestamp, combo)

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

    let groupedExpectedNodesWrapper = chain(ungroupedExpectedNodes)

    if (co) {
      groupedExpectedNodesWrapper = groupedExpectedNodesWrapper.groupBy(item => {
        const collName = item._id.split('/')[0]
        return gb === 'collection' ? collName : collTypes[collName]
      })
        .map((nodes, group) => ({
          [gb]: group,
          total: nodes.length
        }))
        .sortBy(group => st === 'desc' ? -group.total : group.total, gb)
    } else {
      groupedExpectedNodesWrapper = groupedExpectedNodesWrapper.groupBy(item => {
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

    groupedExpectedNodesWrapper = groupedExpectedNodesWrapper.thru(arr => {
      if (lmt) {
        const start = skp
        const end = start + lmt

        return arr.slice(start, end)
      }

      return arr
    })

    if (!co) {
      groupedExpectedNodesWrapper = groupedExpectedNodesWrapper.map(group => {
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

    const expectedNodeGroups = groupedExpectedNodesWrapper.value()
    const params = JSON.stringify({ rawPath, timestamp, combo })

    expect(nodeGroups.length, params).to.equal(expectedNodeGroups.length)

    const aggrField = co ? 'total' : 'nodes'
    nodeGroups.forEach((nodeGroup, idx1) => {
      expect(nodeGroup, params).to.be.an.instanceOf(Object)
      expect(nodeGroup[gb], params).to.equal(expectedNodeGroups[idx1][gb])

      expect(nodeGroup, params).to.have.property(aggrField)
      if (co) {
        expect(nodeGroup[aggrField], params).to.equal(expectedNodeGroups[idx1][aggrField])
      } else {
        expect(nodeGroup[aggrField], params).to.be.an.instanceOf(Array)
        expect(nodeGroup[aggrField].length, params).to.equal(expectedNodeGroups[idx1][aggrField].length)

        if (nodeGroup[aggrField].length > 0) {
          expect(nodeGroup[aggrField][0], params).to.deep.equal(expectedNodeGroups[idx1][aggrField][0])
          nodeGroup[aggrField].forEach((node, idx2) => {
            expect(node, params).to.be.an.instanceOf(Object)
            expect(node._id, params).to.equal(expectedNodeGroups[idx1][aggrField][idx2]._id)
            expect(node._rev, params).to.equal(expectedNodeGroups[idx1][aggrField][idx2]._rev)
          })
        }
      }
    })
  })
}

function buildNodesFromEventLog (path, timestamp) {
  const events = log(path, { until: timestamp, groupBy: 'node', groupSort: 'asc', returnCommands: true })
  // noinspection JSUnresolvedFunction
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
