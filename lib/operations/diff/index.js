'use strict'

const log = require('../log')
const { filter } = require('../helpers')
const { extractDiffs } = require('./helpers')
const { utils: { attachSpan } } = require('foxx-tracing')
const { getComponentTagOption } = require('../../helpers')

const cto = getComponentTagOption(__filename)
const diffFn = function diff (path = '/',
  { since, until, sort, skip, limit, groupSkip, groupLimit, reverse = false, postFilter } = {}) {
  const commandLog = log(path, {
    since,
    until,
    sort,
    skip,
    limit,
    groupBy: 'node',
    groupSort: reverse ? 'desc' : 'asc',
    groupSkip,
    groupLimit,
    returnCommands: true
  })
  const diffs = extractDiffs(commandLog, reverse)

  return postFilter ? filter(diffs, postFilter) : diffs
}

module.exports = attachSpan(diffFn, 'diff', cto)
