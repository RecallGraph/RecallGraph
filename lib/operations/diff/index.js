'use strict'

const log = require('../log')
const jiff = require('jiff')
const { filter } = require('../helpers')
const { omit } = require('lodash')

module.exports = function diff (path = '/',
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

  const diffs = commandLog.map(item => {
    const events = []
    const commands = []
    const diff = {
      node: item.node,
      commandsAreReversed: reverse,
      events,
      commands
    }

    for (const event of item.events) {
      commands.push(reverse ? jiff.inverse(event.command).map(step => omit(step, 'context')) : event.command)
      delete event.command
      events.push(event)
    }

    return diff
  })

  return postFilter ? filter(diffs, postFilter) : diffs
}
