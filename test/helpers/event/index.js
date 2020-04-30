'use strict'

const { aql, db } = require('@arangodb')
const { memoize, concat } = require('lodash')
const { getSampleDataRefs } = require('../util/init')
const { SERVICE_COLLECTIONS } = require('../../../lib/helpers')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const queryPartsInializers = {
  database: () => [
    aql`
      for v in ${eventColl}
      filter !(v['is-origin-node'] || v['is-super-origin-node'])
    `
  ],
  graph: () => {
    const sampleDataRefs = getSampleDataRefs()
    const sampleGraphCollNames = concat(
      sampleDataRefs.vertexCollections,
      sampleDataRefs.edgeCollections
    )

    return [
      aql`
        for v in ${eventColl}
        filter !v['is-origin-node']
        filter v.collection in ${sampleGraphCollNames}
      `
    ]
  }
}

// Public
const initQueryParts = memoize(scope => queryPartsInializers[scope]())

module.exports = {
  initQueryParts
}
