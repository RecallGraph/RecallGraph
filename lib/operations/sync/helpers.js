'use strict'

const { db, aql } = require('@arangodb')
const {
  SERVICE_GRAPHS, SERVICE_COLLECTIONS, getComponentTagOption, DB_OPS: { INSERT, RESTORE, REMOVE, REPLACE }
} = require('../../helpers')
const { utils: { attachSpan, instrumentedQuery } } = require('foxx-tracing')
const show = require('../show')
const commit = require('../commit')
const { getNonServiceCollections, getMatchingCollNames } = require('../helpers')
const { difference, values, chain, find } = require('lodash')
const gg = require('@arangodb/general-graph')
const minimatch = require('minimatch')
const expand = require('brace-expansion')

const cto = getComponentTagOption(__filename)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)

const getExistingUnsynced = attachSpan(function getExistingUnsynced (collName, filter) {
  const coll = db._collection(collName)
  const queryParts = [
    aql`
      for v in ${coll}
    `,
    filter,
    aql`
      let events = (
        for e in ${eventColl}
        filter e.meta.id == v._id
        sort e.ctime desc
        limit 2
        
        return e
      )
  
      filter !length(events) || events[0].meta.rev != v._rev
      
      return {v, e: events}
    `
  ]

  const query = aql.join(queryParts, '\n')

  return instrumentedQuery(query, 'syncExQuery', cto)
}, 'getExistingUnsynced', cto)

const processExistingUnsynced = attachSpan(function processExistingUnsynced (cursor) {
  const result = {
    updated: [],
    restored: [],
    created: []
  }

  while (cursor.hasNext()) {
    const entry = cursor.next()
    const [latestEvent, prevEvent] = entry.e
    const eventType = latestEvent ? latestEvent.event : 'none'
    let old

    switch (eventType) {
      case 'created':
      case 'restored':
      case 'updated':
        old = show(`/n/${latestEvent.meta.id}`, latestEvent.ctime)[0]
        result.updated.push(commit(latestEvent.collection, entry.v, REPLACE, {}, { syncOnly: true, old }))

        break

      case 'deleted':
        old = show(`/n/${prevEvent.meta.id}`, prevEvent.ctime)[0]
        result.restored.push(commit(prevEvent.collection, old, RESTORE, {}, { syncOnly: true }))
        result.updated.push(commit(prevEvent.collection, entry.v, REPLACE, {}, { syncOnly: true, old }))

        break

      case 'none':
        const [collection] = entry.v._id.split('/')
        result.created.push(commit(collection, entry.v, INSERT, {}, { syncOnly: true }))
    }
  }
  cursor.dispose()

  return result
}, 'processExistingUnsynced', cto)

const getDeletedUnsynced = attachSpan(function getDeletedUnsynced (collName, filter) {
  const coll = db._collection(collName)
  const queryParts = [
    aql`
      for e in ${eventColl}
      filter e.event != 'deleted'
      filter e.collection == ${collName}
      filter !e["is-origin-node"]
    `,
    filter,
    aql`   
      let nodes = (
        for v in ${coll}
        filter e.meta.id == v._id 
        return 1
      )
      
      filter !length(nodes)
      sort e.ctime desc
      collect vid = e.meta.id into events = e
      
      return events[0]
    `
  ]

  const query = aql.join(queryParts, '\n')

  return instrumentedQuery(query, 'syncDelQuery', cto)
}, 'getDeletedUnsynced', cto)

const processDeletedUnsynced = attachSpan(function processDeletedUnsynced (cursor) {
  const result = {
    deleted: []
  }

  while (cursor.hasNext()) {
    const event = cursor.next()
    const old = show(`/n/${event.meta.id}`, event.ctime)[0]

    result.deleted.push(commit(event.collection, old, REMOVE, {}, { syncOnly: true }))
  }
  cursor.dispose()

  return result
}, 'processDeletedUnsynced', cto)

const SYNC_TYPES = Object.freeze({
  EXISTING: 'existing',
  DELETED: 'deleted'
})

const SYNC_MAP = Object.freeze({
  [SYNC_TYPES.EXISTING]: {
    get: getExistingUnsynced,
    proc: processExistingUnsynced
  },
  [SYNC_TYPES.DELETED]: {
    get: getDeletedUnsynced,
    proc: processDeletedUnsynced
  }
})

function getAvailableScopes (collections) {
  return {
    database: getDBScope(),
    graph: getGraphScope(),
    collection: getCollectionScope(collections),
    nodeExact: getNodeBraceScope(collections)
  }
}

function getDBScope () {
  return {
    pathPattern: '/',
    collections: getNonServiceCollections
  }
}

function getGraphScope () {
  return {
    pathPattern: '/g/*',
    prefix: '/g/',
    collections: searchPattern => {
      const graphNames = difference(gg._list(), values(SERVICE_GRAPHS))
      const matches = minimatch.match(graphNames, searchPattern)

      return getMatchingCollNames(matches)
    }
  }
}

function getCollectionScope (collections) {
  return {
    pathPattern: '/c/*',
    prefix: '/c/',
    collections: searchPattern => minimatch.match(collections, searchPattern)
  }
}

function getNodeBraceScope (collections) {
  return {
    pathPattern: '/n/**',
    prefix: '/n/',
    collections: searchPattern => chain(expand(searchPattern))
      .map(pattern => pattern.split('/')[0])
      .intersection(collections)
      .value(),
    filters: (searchPattern, collection) => {
      const keys = []
      expand(searchPattern)
        .forEach(nid => {
          const [coll, key] = nid.split('/')
          if (coll === collection) {
            keys.push(key)
          }
        })

      return {
        existing: aql`filter e.meta.key in ${keys}`,
        deleted: aql`filter v._key in ${keys}`
      }
    }
  }
}

function getScopeAndSearchPatternFor (path) {
  const collections = getNonServiceCollections()
  const scopes = getAvailableScopes(collections)

  const scope = find(scopes, scope => minimatch(path, scope.pathPattern))
  const searchPattern = scope.prefix ? path.substring(scope.prefix.length) : path

  return { scope, searchPattern }
}

function getScopeFilters (scope, searchPattern, collection) {
  return scope.filters ? scope.filters(searchPattern, collection) : {
    existing: aql.literal(''),
    deleted: aql.literal('')
  }
}

module.exports = {
  SYNC_TYPES,
  SYNC_MAP,
  getScopeAndSearchPatternFor,
  getScopeFilters
}
