'use strict'

const init = require('../../../helpers/init')
const { diff } = require('../../../../lib/handlers/diffHandlers')
const { SERVICE_COLLECTIONS } = require('../../../../lib/helpers')
const { logHandlerWrapper } = require('../../../helpers/event/log')
const {
  getOriginKeys,
  getRandomGraphPathPattern,
  getSampleTestCollNames,
  getNodeBraceSampleIds
} = require('../../../helpers/event')
const { testDiffs } = require('../../../helpers/event/diff')

const { db, aql } = require('@arangodb')

const { isObject, defaults } = require('lodash')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

describe('Diff Handlers - Path as query param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return diffs in DB scope for the root path', () => {
    const req = {
      queryParams: {
        path: '/'
      }
    }

    return testDiffs('database', req, diffWrapper, logHandlerWrapper)
  })

  it('should return diffs in Graph scope for a graph path', () => {
    const req = {
      queryParams: {
        path: getRandomGraphPathPattern()
      }
    }

    return testDiffs('graph', req, diffWrapper, logHandlerWrapper)
  })

  it('should return diffs in Collection scope for a collection path', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/c/{${sampleTestCollNames}}`
              : `/c/${sampleTestCollNames}`
    const req = {
      queryParams: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta.id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    return testDiffs('collection', req, diffWrapper, logHandlerWrapper, queryParts)
  })

  it('should return diffs in Node Glob scope for a node-glob path', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/ng/{${sampleTestCollNames}}/*`
              : `/ng/${sampleTestCollNames}/*`
    const req = { queryParams: { path } }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta.id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    return testDiffs('nodeGlob', req, diffWrapper, logHandlerWrapper, queryParts)
  })

  it('should return diffs in Node Brace scope for a node-brace path', () => {
    const { path, sampleIds } = getNodeBraceSampleIds(100)
    const req = {
      queryParams: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta.id in ${sampleIds}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testDiffs('nodeBrace', req, diffWrapper, logHandlerWrapper, queryParts)
  })
})

describe('Diff Handlers - Path as body param', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return diffs in DB scope for the root path', () => {
    const req = {
      body: {
        path: '/'
      }
    }

    return testDiffs('database', req, diffWrapper, logHandlerWrapper)
  })

  it('should return diffs in Graph scope for a graph path', () => {
    const req = {
      body: {
        path: getRandomGraphPathPattern()
      }
    }

    return testDiffs('graph', req, diffWrapper, logHandlerWrapper)
  })

  it('should return diffs in Collection scope for a collection path', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/c/{${sampleTestCollNames}}`
              : `/c/${sampleTestCollNames}`
    const req = {
      body: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta.id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    return testDiffs('collection', req, diffWrapper, logHandlerWrapper, queryParts)
  })

  it('should return diffs in Node Glob scope for a node-glob path', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
            sampleTestCollNames.length > 1
              ? `/ng/{${sampleTestCollNames}}/*`
              : `/ng/${sampleTestCollNames}/*`
    const req = { body: { path } }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta.id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    return testDiffs('nodeGlob', req, diffWrapper, logHandlerWrapper, queryParts)
  })

  it('should return diffs in Node Brace scope for a node-brace path', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const req = {
      body: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta.id in ${sampleIds}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testDiffs('nodeBrace', req, diffWrapper, logHandlerWrapper, queryParts)
  })
})

function diffWrapper (pathParam, combo) {
  defaults(pathParam, { queryParams: {} })

  if (isObject(combo)) {
    Object.assign(pathParam.queryParams, combo)
  }

  return diff(pathParam)
}
