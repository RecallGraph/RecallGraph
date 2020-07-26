'use strict'

const { utils: { attachSpan } } = require('foxx-tracing')
const { getComponentTagOption } = require('../../helpers')
const { DB_OPS: { RESTORE } } = require('../../constants')
const log = require('../log')
const show = require('../show')
const commit = require('../commit')

const cto = getComponentTagOption(__filename)

function restore (path, { returnNew = false, silent = false } = {}) {
  const delNodeEvts = log(path, { groupBy: 'node', groupLimit: 2, postFilter: 'events[0].event === "deleted"' })
  const result = []

  for (const group of delNodeEvts) {
    const nid = group.node
    const preDelEvt = group.events[1]
    const prevState = show(`/n/${nid}`, preDelEvt.ctime)[0]
    const [collName] = nid.split('/')

    try {
      result.push(commit(collName, prevState, RESTORE, { returnNew, silent }))
    } catch (e) {
      console.error(e.stack)
      result.push(e)
    }
  }

  return result
}

module.exports = attachSpan(restore, 'restore', cto)
