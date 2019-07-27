'use strict'

const { db, aql } = require('@arangodb')
const jiff = require('jiff')
const {
  getLimitClause,
  getEventLogQueryInitializer
} = require('../helpers')

module.exports = function diff (path = '/', { since, until, skip, limit, reverse = false } = {}) {
  const queryParts = getEventLogQueryInitializer(path, since, until)

  queryParts.push(aql`
    collect node = v.meta._id into commands = e.command
  `)

  queryParts.push(getLimitClause(limit, skip))
  queryParts.push(getReturnClause(reverse))

  const query = aql.join(queryParts, '\n')

  const result = db._query(query).toArray()

  if (reverse) {
    for (let item of result) {
      for (let i = 0; i < item.commands.length; i++) {
        item.commands[i] = jiff.inverse(item.commands[i])
      }
    }
  }

  return result
}

function getReturnClause (reverse) {
  if (reverse) {
    return aql`
      return  {node, commands: reverse(commands)}
    `
  } else {
    return aql`
      return  {node, commands}
    `
  }
}
