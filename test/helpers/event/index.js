'use strict'

const { aql, db } = require('@arangodb')
const { memoize, concat } = require('lodash')
const { getSampleDataRefs } = require('../util/init')
const { SERVICE_COLLECTIONS } = require('../../../lib/helpers')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)
const queryPartsInializers = {
  database: () => [
    aql`
      for v in ${eventColl}
      filter !v['is-origin-node']
      for e in ${commandColl}
      filter e._to == v._id
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
        for e in ${commandColl}
        filter e._to == v._id
      `
    ]
  }
}

// Public
const initQueryParts = memoize(scope => queryPartsInializers[scope]())

module.exports = {
  initQueryParts
}
