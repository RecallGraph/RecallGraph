'use strict'

const jiff = require('jiff')
const { omit } = require('lodash')
const { getComponentTagOption } = require('../../helpers')
const { utils: { attachSpan } } = require('foxx-tracing')

const cto = getComponentTagOption(__filename)

exports.extractDiffs = attachSpan(function extractDiffs (commandLog, reverse) {
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
      events.push(event)
    }

    return diff
  })
}, 'extractDiffs', cto)
