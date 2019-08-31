'use strict'

// noinspection NpmUsedModulesInstalled
const diff = require('../../../../../lib/operations/diff')
const init = require('../../../../helpers/init')
const { testDiffs } = require('../../../../helpers/diffTestHelpers')
const { getRandomGraphPathPattern, getSampleTestCollNames, getOriginKeys, getNodeBraceSampleIds } = require('../../../../helpers/logTestHelpers')
// noinspection NpmUsedModulesInstalled
const { aql, db } = require('@arangodb')
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

describe('Diff', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return diffs in DB scope for the root path', () => testDiffs('database', '/', diff))

  it('should return diffs in Graph scope for a graph path', () => testDiffs('graph', getRandomGraphPathPattern(), diff))

  it('should return diffs in Collection scope for a collection path', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/c/{${sampleTestCollNames}}`
        : `/c/${sampleTestCollNames}`
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    return testDiffs('collection', path, diff, queryParts)
  })

  it('should return diffs in Node Glob scope for a node-glob path', () => {
    const sampleTestCollNames = getSampleTestCollNames()
    const path =
      sampleTestCollNames.length > 1
        ? `/ng/{${sampleTestCollNames}}/*`
        : `/ng/${sampleTestCollNames}/*`
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    return testDiffs('nodeGlob', path, diff, queryParts)
  })

  it('should return diffs in Node Brace scope for a node-brace path', () => {
    const { path, sampleIds } = getNodeBraceSampleIds()
    const queryParts = [
      aql`
          for v in ${eventColl}
          filter v._key not in ${getOriginKeys()}
          filter v.meta._id in ${sampleIds}
          for e in ${commandColl}
          filter e._to == v._id
        `
    ]

    testDiffs('nodeBrace', path, diff, queryParts)
  })
})
