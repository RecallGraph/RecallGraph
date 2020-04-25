'use strict'

const { db, aql } = require('@arangodb')
const init = require('../../../helpers/util/init')
const { SERVICE_COLLECTIONS } = require('../../../../lib/helpers')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern, getRandomNodeBracePathPattern
} = require('../../../helpers/document')
const { testDiffs, diffHandlerQueryWrapper, diffHandlerBodyWrapper } = require('../../../helpers/event/diff')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

describe('Diff Handlers - Path as query param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return diffs in DB scope for the root path', () => {
    const path = '/'

    return testDiffs('database', path, diffHandlerQueryWrapper)
  })

  it('should return diffs in Graph scope for a graph path', () => {
    const path = getRandomGraphPathPattern()

    return testDiffs('graph', path, diffHandlerQueryWrapper)
  })

  it('should return diffs in Collection scope for a collection path', () => {
    const { path, collNames } = getRandomCollectionPathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.collection in ${collNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    return testDiffs('collection', path, diffHandlerQueryWrapper, queryParts)
  })

  it('should return diffs in Node Glob scope for a node-glob path', () => {
    const { path, collNames } = getRandomNodeGlobPathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.collection in ${collNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    return testDiffs('nodeGlob', path, diffHandlerQueryWrapper, queryParts)
  })

  it('should return diffs in Node Brace scope for a node-brace path', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.meta.id in ${nids}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testDiffs('nodeBrace', path, diffHandlerQueryWrapper, queryParts)
  })
})

describe('Diff Handlers - Path as body param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return diffs in DB scope for the root path', () => {
    const path = '/'

    return testDiffs('database', path, diffHandlerBodyWrapper)
  })

  it('should return diffs in Graph scope for a graph path', () => {
    const path = getRandomGraphPathPattern()

    return testDiffs('graph', path, diffHandlerBodyWrapper)
  })

  it('should return diffs in Collection scope for a collection path', () => {
    const { path, collNames } = getRandomCollectionPathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.collection in ${collNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    return testDiffs('collection', path, diffHandlerBodyWrapper, queryParts)
  })

  it('should return diffs in Node Glob scope for a node-glob path', () => {
    const { path, collNames } = getRandomNodeGlobPathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.collection in ${collNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    return testDiffs('nodeGlob', path, diffHandlerBodyWrapper, queryParts)
  })

  it('should return diffs in Node Brace scope for a node-brace path', () => {
    const { path, nids } = getRandomNodeBracePathPattern(true)
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter !v['is-origin-node']
          filter v.meta.id in ${nids}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testDiffs('nodeBrace', path, diffHandlerBodyWrapper, queryParts)
  })
})
