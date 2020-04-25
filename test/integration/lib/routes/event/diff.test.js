'use strict'

const { db, aql } = require('@arangodb')
const init = require('../../../../helpers/util/init')
const { testDiffs, diffGetWrapper, diffPostWrapper } = require('../../../../helpers/event/diff')
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers')
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern, getRandomNodeBracePathPattern
} = require('../../../../helpers/document')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

describe('Routes - diff (Path as query param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return diffs in DB scope for the root path', () => {
    const path = '/'

    testDiffs('database', path, diffGetWrapper)
  })

  it('should return diffs in Graph scope for a graph path', () => {
    const path = getRandomGraphPathPattern()

    testDiffs('graph', path, diffGetWrapper)
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

    testDiffs('collection', path, diffGetWrapper, queryParts)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
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

    testDiffs('nodeGlob', path, diffGetWrapper, queryParts)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
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

    testDiffs('nodeBrace', path, diffGetWrapper, queryParts)
  })
})

describe('Routes - diff (Path as body param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return diffs in DB scope for the root path', () => {
    const path = '/'

    testDiffs('database', path, diffPostWrapper)
  })

  it('should return diffs in Graph scope for a graph path', () => {
    const path = getRandomGraphPathPattern()

    testDiffs('graph', path, diffPostWrapper)
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

    testDiffs('collection', path, diffPostWrapper, queryParts)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
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

    testDiffs('nodeGlob', path, diffPostWrapper, queryParts)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
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

    testDiffs('nodeBrace', path, diffPostWrapper, queryParts)
  })
})
