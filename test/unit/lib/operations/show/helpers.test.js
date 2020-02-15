'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/init')
const { patch, buildShowQuery } = require('../../../../../lib/operations/show/helpers')
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern, getRandomNodeBracePathPattern, cartesian
} = require('../../../../helpers/event')
const log = require('../../../../../lib/operations/log')
const jiff = require('jiff')
const { db, query } = require('@arangodb')

const commandColl = db._collection(SERVICE_COLLECTIONS.commands)
const evtSSLinkColl = db._collection(SERVICE_COLLECTIONS.evtSSLinks)
const snapshotLinkColl = db._collection(SERVICE_COLLECTIONS.snapshotLinks)

describe('Show Helpers - buildShowQuery', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return a "show" query for the provided input params', () => {
    const path = [
      '/', getRandomGraphPathPattern(), getRandomCollectionPathPattern(), getRandomNodeGlobPathPattern(),
      getRandomNodeBracePathPattern()
    ]
    const timestamp = init.getMilestones()
    const sort = ['asc', 'desc']
    const skip = [0, 1]
    const limit = [0, 1]
    const groupBy = [null, 'collection', 'type']
    const countsOnly = [true, false]
    const groupSort = ['asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 1]

    const combos = cartesian(
      { path, timestamp, sort, skip, limit, groupBy, countsOnly, groupSort, groupSkip, groupLimit })
    combos.forEach(combo => {
      const aql = buildShowQuery(combo)

      expect(aql).to.be.an.instanceOf(Object)
      expect(aql).to.have.property('query')
      expect(aql).to.have.property('bindVars')
    })
  })
})

describe('Show Helpers - patch', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return a patched node list for the provided paths', () => {
    const collName = module.context.collectionName('test_raw_data')
    const keys = log(`/c/${collName}`, { limit: 100, groupBy: 'node', countsOnly: true }).map(
      item => item.node.split('/')[1])
    const path = `/n/${collName}/{${keys.join(',')}}`
    const timestamps = init.getMilestones()

    for (const ts of timestamps) {
      const eventLog = log(path, { until: ts, groupBy: 'node', groupSort: 'asc', returnCommands: true })
      const expectedNodes = []

      for (const item of eventLog) {
        let node = {}
        for (let event of item.events) {
          node = jiff.patch(event.command, node, {})
        }

        expectedNodes.push(node)
      }

      const nodeEvents = eventLog.map(item => {
        const lastEvent = item.events[item.events.length - 1]

        return {
          eid: lastEvent._id,
          snid: lastEvent['last-snapshot']
        }
      })

      const paths = query`
        let nodeEvents = ${nodeEvents}
        for ne in nodeEvents
        return (
          for v, e in any shortest_path
          ne.snid to ne.eid
          ${commandColl}, ${evtSSLinkColl}, outbound ${snapshotLinkColl}
          return {hop: keep(v, '_id', 'data'), command: ((e || {}).command || [])}
        )
      `.toArray()

      const actualNodes = patch(paths)

      expect(actualNodes).to.deep.equal(expectedNodes)
    }
  })
})
