'use strict'

// noinspection NpmUsedModulesInstalled
const { expect } = require('chai')
const init = require('../../../../helpers/init')
// noinspection NpmUsedModulesInstalled
const request = require('@arangodb/request')
// noinspection JSUnresolvedVariable
const { baseUrl } = module.context
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers')
// noinspection NpmUsedModulesInstalled
const { isObject, defaults, omitBy, isNil } = require('lodash')
const {
  getOriginKeys,
  getRandomGraphPathPattern,
  getSampleTestCollNames,
  getNodeBraceSampleIds,
  logGetWrapper,
  logPostWrapper
} = require('../../../../helpers/logTestHelpers')
const { testDiffs } = require('../../../../helpers/diffTestHelpers')
// noinspection NpmUsedModulesInstalled
const { db, aql } = require('@arangodb')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

describe('Routes - diff (Path as query param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return diffs in DB scope for the root path', () => {
    const reqParams = {
      json: true,
      qs: {
        path: '/'
      }
    }

    testDiffs('database', reqParams, diffWrapper, logGetWrapper)
  })

  it('should return diffs in Graph scope for a graph path', () => {
    const reqParams = {
      json: true,
      qs: {
        path: getRandomGraphPathPattern()
      }
    }

    testDiffs('graph', reqParams, diffWrapper, logGetWrapper)
  })

  it('should return diffs in Collection scope for a collection path', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const reqParams = {
      json: true,
      qs: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testDiffs('collection', reqParams, diffWrapper, logGetWrapper, queryParts)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const reqParams = {
      json: true,
      qs: { path }
    }
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter v._key not in ${getOriginKeys()}
        filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
        for e in ${commandColl}
        filter e._to == v._id
      `
    ]

    testDiffs('nodeGlob', reqParams, diffWrapper, logGetWrapper, queryParts)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds(100)
    const reqParams = {
      json: true,
      qs: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta._id in ${sampleIds}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testDiffs('nodeBrace', reqParams, diffWrapper, logGetWrapper, queryParts)
  })
})

describe('Routes - diff (Path as body param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return diffs in DB scope for the root path', () => {
    const reqParams = {
      json: true,
      qs: {
        path: '/'
      }
    }

    testDiffs('database', reqParams, diffWrapperPost, logPostWrapper)
  })

  it('should return diffs in Graph scope for a graph path', () => {
    const reqParams = {
      json: true,
      qs: {
        path: getRandomGraphPathPattern()
      }
    }

    testDiffs('graph', reqParams, diffWrapperPost, logPostWrapper)
  })

  it('should return diffs in Collection scope for a collection path', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const reqParams = {
      json: true,
      qs: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testDiffs('collection', reqParams, diffWrapperPost, logPostWrapper, queryParts)
  })

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const reqParams = {
      json: true,
      qs: { path }
    }
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter v._key not in ${getOriginKeys()}
        filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
        for e in ${commandColl}
        filter e._to == v._id
      `
    ]

    testDiffs('nodeGlob', reqParams, diffWrapperPost, logPostWrapper, queryParts)
  })

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified', () => {
    const { path, sampleIds } = getNodeBraceSampleIds(100)
    const reqParams = {
      json: true,
      qs: { path }
    }
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta._id in ${sampleIds}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testDiffs('nodeBrace', reqParams, diffWrapperPost, logPostWrapper, queryParts)
  })
})

function diffWrapper (reqParams, combo, method = 'get') {
  defaults(reqParams, { qs: {} })

  if (isObject(combo)) {
    Object.assign(reqParams.qs, omitBy(combo, isNil))
  }

  const response = request[method](`${baseUrl}/event/diff`, reqParams)

  expect(response).to.be.an.instanceOf(Object)
  expect(response.statusCode).to.equal(200)

  return JSON.parse(response.body)
}

function diffWrapperPost (reqParams, combo) {
  return diffWrapper(reqParams, combo, 'post')
}
