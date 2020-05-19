'use strict'

const { getComponentTagOption } = require('../../helpers')
const { utils: { attachSpan } } = require('foxx-tracing')
// const log = require('../log')

const cto = getComponentTagOption(__filename)

function sync (path = '/') {
  // const latestRecordedEvents = log(path, { groupBy: 'node', groupLimit: 1 })
}

module.exports = attachSpan(sync, 'sync', cto)
