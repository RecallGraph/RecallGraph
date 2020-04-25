'use strict'

const { aql, db } = require('@arangodb')
const init = require('../../../../helpers/util/init')
const diff = require('../../../../../lib/operations/diff')
const { testDiffs } = require('../../../../helpers/event/diff')
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern, getRandomNodeBracePathPattern
} = require('../../../../helpers/document')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

describe('Diff', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return diffs in DB scope for the root path', () => testDiffs('database', '/', diff))

  it('should return diffs in Graph scope for a graph path',
    () => testDiffs('graph', getRandomGraphPathPattern(), diff))

  it('should return diffs in Collection scope for a collection path', () => {
    const { path, pattern } = getRandomCollectionPathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.collection in ${pattern}
        `
    ]

    return testDiffs('collection', path, diff, queryParts)
  })

  it('should return diffs in Node Glob scope for a node-glob path', () => {
    const { path, pattern } = getRandomNodeGlobPathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.collection in ${pattern}
        `
    ]

    return testDiffs('nodeGlob', path, diff, queryParts)
  })

  it('should return diffs in Node Brace scope for a node-brace path', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.meta.id in ${nids}
        `
    ]

    testDiffs('nodeBrace', path, diff, queryParts)
  })
})
