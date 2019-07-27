'use strict'

const { expect } = require('chai')
const { query } = require('@arangodb')
const diff = require('../../../../../lib/operations/diff')
const init = require('../../../../helpers/init')
const jiff = require('jiff')
const { TRANSIENT_EVENT_SUPERNODE, SERVICE_GRAPHS, SERVICE_COLLECTIONS } = require('../../../../../lib/helpers')
const { differenceBy } = require('lodash')

describe('Diff - DB Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return forward diffs in DB scope for the root path, when reverse is false', () => {
    const path = '/'

    const allDiffs = diff(path)
    expect(allDiffs).to.be.an.instanceOf(Array)

    const expectedDiffs = query`
      for v, e, p in 2..${Number.MAX_SAFE_INTEGER}
        outbound ${TRANSIENT_EVENT_SUPERNODE}
        graph ${SERVICE_GRAPHS.eventLog}
        filter is_same_collection(${SERVICE_COLLECTIONS.events}, v)
        collect node = v.meta._id into commands = e.command
      return {node, commands}
    `.toArray()

    expect(allDiffs, JSON.stringify({
      all: differenceBy(allDiffs, expectedDiffs, 'node'),
      expected: differenceBy(expectedDiffs, allDiffs, 'node')
    })).to.have.deep.members(expectedDiffs)
  })

  it('should return reverse diffs in DB scope for the root path, when reverse is true', () => {
    const path = '/'

    const allDiffs = diff(path, { reverse: true })
    expect(allDiffs).to.be.an.instanceOf(Array)

    const expectedDiffs = query`
      for v, e, p in 2..${Number.MAX_SAFE_INTEGER}
        outbound ${TRANSIENT_EVENT_SUPERNODE}
        graph ${SERVICE_GRAPHS.eventLog}
        filter is_same_collection(${SERVICE_COLLECTIONS.events}, v)
        collect node = v.meta._id into commands = e.command
      return {node, commands: reverse(commands)}
    `.toArray()

    for (let item of expectedDiffs) {
      for (let i = 0; i < item.commands.length; i++) {
        item.commands[i] = jiff.inverse(item.commands[i])
      }
    }

    expect(allDiffs, JSON.stringify({
      all: differenceBy(allDiffs, expectedDiffs, 'node'),
      expected: differenceBy(expectedDiffs, allDiffs, 'node')
    })).to.have.deep.members(expectedDiffs)
  })
})
