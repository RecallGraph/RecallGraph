'use strict'

const log = require('../log')
const jiff = require('jiff')

module.exports = function diff (path = '/',
  { since, until, sort = 'asc', skip, limit, groupSkip, groupLimit, reverse = false } = {}) {
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

  return commandLog.map(item => ({
    node: item.node,
    commands: item.events.map(event => reverse ? jiff.inverse(event.command) : event.command)
  }))
}
