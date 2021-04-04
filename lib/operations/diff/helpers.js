'use strict'

const jiff = require('jiff')
const { omit, pick } = require('lodash')
const { getComponentTagOption } = require('../../helpers')
const { getSort } = require('../helpers')
const { getGroupExpr } = require('../log/helpers')
const { utils: { attachSpan } } = require('@recallgraph/foxx-tracer')
const { aql } = require('@arangodb')

const cto = getComponentTagOption(__filename)

exports.extractDiffs = attachSpan(function extractDiffs (commandLog, reverse) {
  reverse = !!reverse

  return commandLog.map(item => {
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
      events.push(pick(event, '_id', '_key', 'ctime', 'event', 'last-snapshot', 'meta.rev'))
    }

    return diff
  })
}, 'extractDiffs', cto)

exports.getGroupingClause = function getGroupingClause () {
  const groupBy = 'node'
  const groupExpr = getGroupExpr(groupBy)
  const groupingSuffix = 'into events = merge(v, {command: e.command})'

  return aql.literal(`collect ${groupBy} = ${groupExpr} ${groupingSuffix}`)
}

exports.getReturnClause = function getReturnClause (reverse) {
  const groupSortDir = getSort(reverse ? 'desc' : 'asc')

  return aql`
    return {node, events: (
      for ev in events sort ev.ctime ${groupSortDir}
      return ev
    )}
  `
}
