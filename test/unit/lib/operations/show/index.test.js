'use strict'

const { expect } = require('chai')
const show = require('../../../../../lib/operations/show')
const init = require('../../../../helpers/init')
// const {
//         getRandomGraphPathPattern, getSampleTestCollNames, getOriginKeys, getNodeBraceSampleIds
//       } = require('../../../../helpers/event')
const log = require('../../../../../lib/operations/log')
const {
  testUngroupedNodes, testGroupedNodes, buildNodesFromEventLog
} = require('../../../../helpers/event/show')

describe('Show - DB Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return ungrouped nodes in DB scope for the root path when groupBy  is null, and countsOnly is falsey',
    () => {
      const path = '/'

      for (let timestamp of init.getMilestones()) {
        const allNodes = show(path, timestamp)

        expect(allNodes).to.be.an.instanceOf(Array)

        const expectedNodes = buildNodesFromEventLog(path, timestamp)

        testUngroupedNodes(path, timestamp, allNodes, expectedNodes, show)
      }
    })

  it('should return total node count in DB scope for the root path when groupBy  is null, and countsOnly is true',
    () => {
      const path = '/'

      for (let timestamp of init.getMilestones()) {
        const result = show(path, timestamp, { countsOnly: true })

        expect(result).to.be.an.instanceOf(Object)

        const events = log('/', { until: timestamp, groupBy: 'node', groupLimit: 1 })
        // noinspection JSUnresolvedFunction
        const expectedTotal = events.filter(item => item.events[0].event !== 'deleted').length

        // noinspection JSUnresolvedVariable
        expect(result.total).to.equal(expectedTotal)
      }
    })

  it('should return grouped events in DB scope for the root path, when groupBy is specified', () => {
    const path = '/'

    for (let timestamp of init.getMilestones()) {
      testGroupedNodes('database', path, path, timestamp, show)
    }
  })
})

// describe('Log - Graph Scope', () => {
//   before(() => init.setup({ ensureSampleDataLoad: true }))
//
//   after(init.teardown)
//
//   it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified', () => {
//     const path = getRandomGraphPathPattern()
//
//     const allEvents = log(path) // Ungrouped events in desc order by ctime.
//
//     expect(allEvents).to.be.an.instanceOf(Array)
//
//     const sampleDataRefs = init.getSampleDataRefs()
//     const sampleGraphCollNames = concat(
//       sampleDataRefs.vertexCollections,
//       sampleDataRefs.edgeCollections
//     )
//     const expectedEvents = query`
//         for e in ${eventColl}
//           filter e._key not in ${getOriginKeys()}
//           filter regex_split(e.meta._id, '/')[0] in ${sampleGraphCollNames}
//           for c in ${commandColl}
//             filter c._to == e._id
//           sort e.ctime desc
//         return merge(e, keep(c, 'command'))
//       `.toArray()
//
//     testUngroupedEvents(path, allEvents, expectedEvents, log)
//   })
//
//   it('should return grouped events in Graph scope for a graph path, when groupBy is specified', () =>
//     testGroupedEvents('graph', getRandomGraphPathPattern(), log))
// })
//
// describe('Log - Collection Scope', () => {
//   before(() => init.setup({ ensureSampleDataLoad: true }))
//
//   after(init.teardown)
//
//   it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified', () =>
// { const sampleTestCollNames = getSampleTestCollNames() const path = sampleTestCollNames.length > 1 ?
// `/c/{${sampleTestCollNames}}` : `/c/${sampleTestCollNames}` const allEvents = log(path) // Ungrouped events in desc
// order by ctime.  expect(allEvents).to.be.an.instanceOf(Array)  const expectedEvents = query` for e in ${eventColl}
// filter e._key not in ${getOriginKeys()} filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames} for c in
// ${commandColl} filter c._to == e._id sort e.ctime desc return merge(e, keep(c, 'command')) `.toArray()
// testUngroupedEvents(path, allEvents, expectedEvents, log) })  it('should return grouped events in Collection scope
// for a collection path, when groupBy is specified', () => { const sampleTestCollNames = getSampleTestCollNames()
// const path = sampleTestCollNames.length > 1 ? `/c/{${sampleTestCollNames}}` : `/c/${sampleTestCollNames}` const
// queryParts = [ aql` for v in ${eventColl} filter v._key not in ${getOriginKeys()} filter regex_split(v.meta._id,
// '/')[0] in ${sampleTestCollNames} for e in ${commandColl} filter e._to == v._id ` ]  testGroupedEvents('collection',
// path, log, queryParts) }) })  describe('Log - Node Glob Scope', () => { before(() => init.setup({
// ensureSampleDataLoad: true }))  after(init.teardown)  it('should return ungrouped events in Node Glob scope for a
// node-glob path, when no groupBy is specified', () => { const sampleTestCollNames = getSampleTestCollNames() const
// path = sampleTestCollNames.length > 1 ? `/ng/{${sampleTestCollNames}}/*` : `/ng/${sampleTestCollNames}/*` const
// allEvents = log(path) // Ungrouped events in desc order by ctime.  expect(allEvents).to.be.an.instanceOf(Array)
// const expectedEvents = query` for e in ${eventColl} filter e._key not in ${getOriginKeys()} filter
// regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames} for c in ${commandColl} filter c._to == e._id sort e.ctime
// desc return merge(e, keep(c, 'command')) `.toArray()  testUngroupedEvents(path, allEvents, expectedEvents, log) })
// it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => { const
// sampleTestCollNames = getSampleTestCollNames() const path = sampleTestCollNames.length > 1 ?
// `/ng/{${sampleTestCollNames}}/*` : `/ng/${sampleTestCollNames}/*` const queryParts = [ aql` for v in ${eventColl}
// filter v._key not in ${getOriginKeys()} filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames} for e in
// ${commandColl} filter e._to == v._id ` ]  testGroupedEvents('nodeGlob', path, log, queryParts) }) })  describe('Log
// - Node Brace Scope', () => { before(() => init.setup({ ensureSampleDataLoad: true }))  after(init.teardown)
// it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified', () => {
// const { path, sampleIds } = getNodeBraceSampleIds() const allEvents = log(path) // Ungrouped events in desc order by
// ctime.  expect(allEvents).to.be.an.instanceOf(Array)  const expectedEvents = query` for e in ${eventColl} filter
// e._key not in ${getOriginKeys()} filter e.meta._id in ${sampleIds} for c in ${commandColl} filter c._to == e._id
// sort e.ctime desc return merge(e, keep(c, 'command')) `.toArray()  testUngroupedEvents(path, allEvents,
// expectedEvents, log) })  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is
// specified', () => { const { path, sampleIds } = getNodeBraceSampleIds() const queryParts = [ aql` for v in
// ${eventColl} filter v._key not in ${getOriginKeys()} filter v.meta._id in ${sampleIds} for e in ${commandColl}
// filter e._to == v._id ` ]  testGroupedEvents('nodeBrace', path, log, queryParts) }) })
