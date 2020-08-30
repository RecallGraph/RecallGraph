'use strict'

const { snapshotInterval, getCollectionType, getComponentTagOption } = require('../../helpers')
const {
  SERVICE_COLLECTIONS, TRANSIENT_EVENT_SUPERNODE, SERVICE_GRAPHS,
  COLLECTION_TYPES: { VERTEX, EDGE },
  SYNC_TYPES: { DELETED: SYNC_DELETED, EXISTING },
  DB_OPS: { INSERT, UPDATE, REMOVE, REPLACE, RESTORE },
  EVENTS: { DELETED, COLL_INIT, CREATED, RESTORED, UPDATED }
} = require('../../constants')
const { getNonServiceCollections, getMatchingCollNames } = require('../helpers')
const {
  merge, cloneDeep, pick, memoize, mapKeys, intersection, noop, filter, last, difference, values, chain, find
} = require('lodash')
const jiff = require('jiff')
const { db, time: dbtime, errors: ARANGO_ERRORS, query, aql } = require('@arangodb')
const { utils: { attachSpan, instrumentedQuery } } = require('@recallgraph/foxx-tracer')
const show = require('../show')
const commit = require('.')
const gg = require('@arangodb/general-graph')
const minimatch = require('minimatch')
const expand = require('brace-expansion')

const cto = getComponentTagOption(__filename)

const commandColl = db._collection(SERVICE_COLLECTIONS.commands)
const snapshotColl = db._collection(SERVICE_COLLECTIONS.snapshots)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const evtSSLinkColl = db._collection(SERVICE_COLLECTIONS.evtSSLinks)
const snapshotLinkColl = db._collection(SERVICE_COLLECTIONS.snapshotLinks)
const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
const skeletonEdgeHubsColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeHubs)
const skeletonEdgeSpokesColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeSpokes)

// Private
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
    updated: 0,
    restored: 0,
    created: 0
  }

  while (cursor.hasNext()) {
    const entry = cursor.next()
    const [latestEvent, prevEvent] = entry.e
    const eventType = latestEvent ? latestEvent.event : 'none'
    let old

    switch (eventType) {
      case CREATED:
      case RESTORED:
      case UPDATED:
        old = show(`/n/${latestEvent.meta.id}`, latestEvent.ctime)[0]
        commit(latestEvent.collection, entry.v, REPLACE, { silent: true }, { syncOnly: true, old })
        result.updated++

        break

      case DELETED:
        old = show(`/n/${prevEvent.meta.id}`, prevEvent.ctime)[0]

        commit(prevEvent.collection, old, RESTORE, { silent: true }, { syncOnly: true })
        result.restored++

        commit(prevEvent.collection, entry.v, REPLACE, { silent: true }, { syncOnly: true, old })
        result.updated++

        break

      case 'none':
        const [collection] = entry.v._id.split('/')
        commit(collection, entry.v, INSERT, { silent: true }, { syncOnly: true })
        result.created++
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
      filter events[0].event != ${DELETED}
      
      return events[0]
    `
  ]

  const query = aql.join(queryParts, '\n')

  return instrumentedQuery(query, 'syncDelQuery', cto)
}, 'getDeletedUnsynced', cto)

const processDeletedUnsynced = attachSpan(function processDeletedUnsynced (cursor) {
  const result = {
    deleted: 0
  }

  while (cursor.hasNext()) {
    const event = cursor.next()
    const old = show(`/n/${event.meta.id}`, event.ctime)[0]

    commit(event.collection, old, REMOVE, { silent: true }, { syncOnly: true })
    result.deleted++
  }
  cursor.dispose()

  return result
}, 'processDeletedUnsynced', cto)

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

const sgOps = {
  [VERTEX]: {
    created: (collName, key, evtNode) => {
      const _key = `${collName}.${key}`

      skeletonVerticesColl.insert({
        _key,
        validity: [
          {
            valid_since: evtNode.ctime,
            valid_until: Number.MAX_VALUE
          }
        ],
        collection: collName,
        meta: pick(evtNode.meta, 'id', 'key')
      })
    },
    deleted: (collName, key, evtNode) => {
      const _key = `${collName}.${key}`

      query`
        for sv in ${skeletonVerticesColl}
        filter sv._key == ${_key}
        
        let v1 = pop(sv.validity)
        let v2 = last(sv.validity)
        let v3 = merge(v2, { valid_until: ${evtNode.ctime} })
        let v4 = push(v1, v3)
        
        update sv with { validity: v4 } in ${skeletonVerticesColl}
      `
    },
    updated: noop,
    restored: (collName, key, evtNode) => {
      const _key = `${collName}.${key}`

      query`
        for sv in ${skeletonVerticesColl}
        filter sv._key == ${_key}
        
        let v1 = push(sv.validity, { valid_since: ${evtNode.ctime}, valid_until: ${Number.MAX_VALUE} })
        
        update sv with { validity: v1 } in ${skeletonVerticesColl}
      `
    }
  },
  [EDGE]: {
    created: (collName, key, evtNode) => {
      const skCollMap = getSkCollMap()
      const _key = `${collName}.${key}`
      const hub = skeletonEdgeHubsColl.insert({
        _key,
        validity: [
          {
            valid_since: evtNode.ctime,
            valid_until: Number.MAX_VALUE
          }
        ],
        collection: collName,
        meta: pick(evtNode.meta, 'id', 'key', 'from', 'to')
      })._id

      const [fCollName, fKey] = evtNode.meta.from.split('/')
      const fromKey = `${fCollName}.${fKey}`
      const _from = `${skCollMap[fCollName]}/${fromKey}`
      const [tCollName, tKey] = evtNode.meta.to.split('/')
      const toKey = `${tCollName}.${tKey}`
      const _to = `${skCollMap[tCollName]}/${toKey}`

      skeletonEdgeSpokesColl.insert([
        {
          hub,
          validity: [
            {
              valid_since: evtNode.ctime,
              valid_until: Number.MAX_VALUE
            }
          ],
          _from,
          _to:
          hub
        },
        {
          hub,
          validity: [
            {
              valid_since: evtNode.ctime,
              valid_until: Number.MAX_VALUE
            }
          ],
          _from: hub,
          _to
        }
      ])
    },
    deleted: (collName, key, evtNode) => {
      const hid = `${SERVICE_COLLECTIONS.skeletonEdgeHubs}/${collName}.${key}`

      query`
        for seh in ${skeletonEdgeHubsColl}
        filter seh._id == ${hid}
        
        let v1 = pop(seh.validity)
        let v2 = last(seh.validity)
        let v3 = merge(v2, { valid_until: ${evtNode.ctime} })
        let v4 = push(v1, v3)
        
        update seh with { validity: v4 } in ${skeletonEdgeHubsColl}
      `
      query`
        for ses in ${skeletonEdgeSpokesColl}
        filter ses.hub == ${hid}
        
        let v2 = last(ses.validity)
        filter v2.valid_until > ${evtNode.ctime}
        
        let v1 = pop(ses.validity)
        let v3 = merge(v2, { valid_until: ${evtNode.ctime} })
        let v4 = push(v1, v3)
        
        update ses with { validity: v4 } in ${skeletonEdgeSpokesColl}
      `
    },
    updated: (collName, key, evtNode) => {
      const endpoints = intersection(Object.keys(evtNode.meta), ['fromNew', 'toNew', 'fromOld', 'toOld'])
      if (endpoints.length) {
        const skCollMap = getSkCollMap()
        const fromOld = getEndpoint(skCollMap, evtNode, 'from', 'Old')
        const fromNew = getEndpoint(skCollMap, evtNode, 'from', 'New')
        const toOld = getEndpoint(skCollMap, evtNode, 'to', 'Old')
        const toNew = getEndpoint(skCollMap, evtNode, 'to', 'New')
        const from = filter([fromOld, fromNew])
        const to = filter([toOld, toNew])

        const hub = `${SERVICE_COLLECTIONS.skeletonEdgeHubs}/${collName}.${key}`
        const edges = query`
          for ses in ${skeletonEdgeSpokesColl}
          
          filter ses.hub == ${hub}
          filter ses._from in ${from} || ses._to in ${to}
          
          return ses
        `.toArray()
        const inserts = []
        const updateKeys = []
        const updateValues = []
        const epMap = { fromOld, toOld, fromNew, toNew }

        for (const ep of endpoints) {
          const field = `_${ep.slice(0, -3)}`
          let e = edges.find(e => e[field] === epMap[ep])

          if (e) {
            const type = ep.slice(-3)
            switch (type.toLowerCase()) {
              case 'old':
                const v = last(e.validity)
                v.valid_until = evtNode.ctime

                break

              case 'new':
                e.validity.push({
                  valid_since: evtNode.ctime,
                  valid_until: Number.MAX_VALUE
                })
            }

            updateKeys.push(e._key)
            updateValues.push(pick(e, 'validity'))
          } else {
            const other = field === '_from' ? '_to' : '_from'

            inserts.push({
              hub,
              validity: [
                {
                  valid_since: evtNode.ctime,
                  valid_until: Number.MAX_VALUE
                }
              ],
              [field]: epMap[ep],
              [other]: hub
            })
          }
        }

        skeletonEdgeSpokesColl.insert(inserts)
        skeletonEdgeSpokesColl.update(updateKeys, updateValues)
      }
    },
    restored: (collName, key, evtNode) => {
      const hid = `${SERVICE_COLLECTIONS.skeletonEdgeHubs}/${collName}.${key}`

      query`
        for seh in ${skeletonEdgeHubsColl}
        filter seh._id == ${hid}
        
        let v1 = push(seh.validity, { valid_since: ${evtNode.ctime}, valid_until: ${Number.MAX_VALUE} })
        
        update seh with { validity: v1 } in ${skeletonEdgeHubsColl}
      `

      query`
        for ses in ${skeletonEdgeSpokesColl}
        filter ses.hub == ${hid}
        
        let v2 = last(ses.validity)
        filter has(v2, 'valid_until')
        sort v2.valid_until desc
        limit 2
        
        let v1 = push(ses.validity, { valid_since: ${evtNode.ctime}, valid_until: ${Number.MAX_VALUE} })
        
        update ses with { validity: v1 } in ${skeletonEdgeSpokesColl}
      `
    }
  }
}

const compatiblePrevEvents = {
  [INSERT]: [COLL_INIT],
  [UPDATE]: [CREATED, UPDATED, RESTORED],
  [REPLACE]: [CREATED, UPDATED, RESTORED],
  [REMOVE]: [CREATED, UPDATED, RESTORED],
  [RESTORE]: [DELETED]
}

function getEndpoint (skCollMap, evtNode, end, age) {
  let endpoint = null
  const ep = `${end}${age}`

  if (evtNode.meta[ep]) {
    const [collName, key] = evtNode.meta[ep].split('/')
    const epKey = `${collName}.${key}`

    endpoint = `${skCollMap[collName]}/${epKey}`
  }

  return endpoint
}

function getSkCollMap () {
  const edgeCollections = getNonServiceCollections().filter(coll => getCollectionType(coll) === EDGE)
  const vertexCollections = getNonServiceCollections().filter(
    coll => getCollectionType(coll) === VERTEX)

  const skCollMap = {}
  vertexCollections.forEach(function (coll) { skCollMap[coll] = SERVICE_COLLECTIONS.skeletonVertices })
  edgeCollections.forEach(function (coll) { skCollMap[coll] = SERVICE_COLLECTIONS.skeletonEdgeHubs })

  return skCollMap
}

const getTransientSnapshotOriginFor = memoize(coll => {
  const key = `origin-${coll._id}`

  return {
    _id: `${snapshotColl.name()}/${key}`,
    _key: key,
    'is-origin-node': true,
    data: {}
  }
}, coll => coll.name())

function ensureEventSupernode () {
  if (!eventColl.exists(TRANSIENT_EVENT_SUPERNODE)) {
    try {
      const superOrigin = Object.assign({ ctime: dbtime() }, TRANSIENT_EVENT_SUPERNODE)
      eventColl.insert(superOrigin, {
        waitForSync: true,
        silent: true
      })
    } catch (e) {
      console.error(e.stack)
      if (
        e.errorNum !==
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      ) {
        throw e
      }
    }
  }
}

function getSelector (collName, node, ignoreRevs) {
  const selectorKeys = ['_key', '_id']
  if (!ignoreRevs) {
    selectorKeys.push('_rev')
  }

  const selector = pick(node, selectorKeys)
  if (!selector._id) {
    selector._id = `${collName}/${selector._key}`
  }

  return selector
}

function rejectIfIncompatible (op, prevEvent, selector) {
  if (!compatiblePrevEvents[op].includes(prevEvent.event)) {
    const e = new Error(
      `Event log not found for node with _id: ${selector._id}. Run \`sync\` first to make the event log catch up.`
    )
    e.errorNum = ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
    e.errorMessage = e.message

    throw e
  }
}

function ensureSnapshotOriginNode (collName) {
  const coll = db._collection(collName)
  const origin = getTransientSnapshotOriginFor(coll)

  if (!snapshotColl.exists(origin)) {
    try {
      snapshotColl.insert(origin, {
        waitForSync: true,
        silent: true
      })
    } catch (e) {
      console.error(e.stack)
      if (
        e.errorNum !==
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      ) {
        throw e
      }
    }
  }

  return origin
}

function insertSnapshotLink (fromSSNodeId, toSSNodeId) {
  const snapshotLinkEdge = {
    _from: fromSSNodeId,
    _to: toSSNodeId
  }

  return snapshotLinkColl.insert(snapshotLinkEdge, { returnNew: true }).new
}

// Public
const SYNC_MAP = Object.freeze({
  [EXISTING]: {
    get: getExistingUnsynced,
    proc: processExistingUnsynced
  },
  [SYNC_DELETED]: {
    get: getDeletedUnsynced,
    proc: processDeletedUnsynced
  }
})

const ensureEventOriginNode = attachSpan(function ensureEventOriginNode (collName) {
  ensureEventSupernode()
  const coll = db._collection(collName)
  const tOrigin = getTransientEventOriginFor(coll)

  if (!eventColl.exists(tOrigin)) {
    try {
      let origin = Object.assign({ ctime: dbtime() }, tOrigin)
      origin = eventColl.insert(origin)

      insertCommandEdge(TRANSIENT_EVENT_SUPERNODE, origin, {}, {})

      const snapshotOrigin = ensureSnapshotOriginNode(collName)
      insertEvtSSLink(origin._id, snapshotOrigin._id)
    } catch (e) {
      console.error(e.stack)
      if (
        e.errorNum !==
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      ) {
        throw e
      }
    }
  }
}, 'ensureEventOriginNode', cto)

const getLatestEvent = attachSpan(function getLatestEvent (node, coll) {
  let latest

  const cursor = query`
    for e in ${eventColl}
      filter e.meta.id == ${node._id}
      sort e['hops-from-origin'] desc
      limit 1
    return e
  `
  if (cursor.hasNext()) {
    latest = cursor.next()
  } else {
    latest = getTransientEventOriginFor(coll)
  }

  cursor.dispose()

  return latest
}, 'getLatestEvent', cto)

const getTransientEventOriginFor = attachSpan(memoize(coll => {
  const key = `origin-${coll._id}`
  const snapshot = getTransientSnapshotOriginFor(coll)
  const id = `${eventColl.name()}/${key}`

  return {
    _id: id,
    _key: key,
    'is-origin-node': true,
    collection: coll.name(),
    meta: { id },
    event: COLL_INIT,
    'last-snapshot': snapshot._id,
    'hops-from-last-snapshot': 1,
    'hops-from-origin': 0
  }
}, coll => coll.name()), 'getTransientEventOriginFor', cto)

const getTransientOrCreateLatestSnapshot = attachSpan(
  function getTransientOrCreateLatestSnapshot (collName, lastEvtNode, node, ctime) {
    const ssInterval = snapshotInterval(collName)

    let ssNode = null
    let hopsFromLast
    let prevSSid
    if (ssInterval > 0) {
      if (
        lastEvtNode['last-snapshot'] &&
        lastEvtNode['hops-from-last-snapshot'] < ssInterval
      ) {
        ssNode = {
          _id: lastEvtNode['last-snapshot']
        }
        hopsFromLast = lastEvtNode['hops-from-last-snapshot'] + 1
      } else {
        ssNode = {
          ctime,
          data: node
        }
        ssNode = snapshotColl.insert(ssNode, { returnNew: true }).new
        hopsFromLast = 1
        prevSSid = lastEvtNode['last-snapshot']

        insertSnapshotLink(prevSSid, ssNode._id)
      }
    }

    return { ssNode, hopsFromLast, prevSSid }
  },
  'getTransientOrCreateLatestSnapshot', cto)

const insertCommandEdge = attachSpan(function insertCommandEdge (prevEvent, evtNode, oldNode, newNode) {
  const cmdEdge = {
    _from: prevEvent._id,
    _to: evtNode._id,
    command: jiff.diff(oldNode, newNode, {})
  }
  if (prevEvent['is-origin-node']) {
    cmdEdge.meta = {
      id: newNode._id
    }
  }

  return commandColl.insert(cmdEdge, { returnNew: true }).new
}, 'insertCommandEdge', cto)

const insertEventNode = attachSpan(function insertEventNode (nodeMeta, time, event, ssData, prevEvent, collName) {
  const evtNode = {
    meta: metaize(cloneDeep(nodeMeta)),
    ctime: time,
    event,
    collection: collName
  }

  if (ssData.ssNode) {
    merge(evtNode, {
      'last-snapshot': ssData.ssNode._id,
      'hops-from-last-snapshot': ssData.hopsFromLast,
      'hops-from-origin': prevEvent['hops-from-origin'] + 1
    })
  }

  return eventColl.insert(evtNode, { returnNew: true }).new
}, 'insertEventNode', cto)

const insertEvtSSLink = attachSpan(function insertEvtSSLink (evtNodeId, ssNodeId) {
  const evtSSLinkEdge = {
    _from: evtNodeId,
    _to: ssNodeId
  }

  return evtSSLinkColl.insert(evtSSLinkEdge, { returnNew: true }).new
}, 'insertEvtSSLink', cto)

const prepInsert = attachSpan(function prepInsert (collName, node, { syncOnly = false } = {}) {
  if (!syncOnly && (node._id || node._key)) {
    const nid = node._id || `${collName}/${node._key}`
    const event = eventColl.firstExample('meta.id', nid, 'event', DELETED)
    if (event) {
      const e = new Error(
        `Event log found for node with _id: ${nid}. Restore to reuse, or specify a new id/key.`
      )
      e.errorNum = ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      e.errorMessage = e.message

      throw e
    }
  }

  const coll = db._collection(collName)
  let result
  if (syncOnly) {
    result = Object.assign(pick(node, '_id', '_key', '_rev'), { new: node })
  } else {
    result = coll.insert(node, {
      returnNew: true
    })
  }

  const time = dbtime()
  result.old = {}
  const event = CREATED
  const prevEvent = getLatestEvent(result, coll)

  rejectIfIncompatible(INSERT, prevEvent, result)

  const ssData = getTransientOrCreateLatestSnapshot(
    collName,
    prevEvent,
    result.new,
    time
  )

  ensureEventOriginNode(collName)

  return { result, event, time, prevEvent, ssData }
}, 'prepInsert', cto)

const prepRestore = attachSpan(function prepRestore (collName, node, { syncOnly = false } = {}) {
  const coll = db._collection(collName)
  let result
  if (syncOnly) {
    result = Object.assign(pick(node, '_id', '_key', '_rev'), { new: node })
  } else {
    result = coll.insert(node, {
      returnNew: true
    })
  }

  const time = dbtime()
  result.old = {}
  const event = RESTORED
  const prevEvent = getLatestEvent(result, coll)

  rejectIfIncompatible(RESTORE, prevEvent, result)

  const ssData = getTransientOrCreateLatestSnapshot(
    collName,
    prevEvent,
    result.new,
    time
  )

  ensureEventOriginNode(collName)

  return { result, event, time, prevEvent, ssData }
}, 'prepRestore', cto)

const prepReplace = attachSpan(
  function prepReplace (collName, node, { ignoreRevs = true, syncOnly = false, old = null } = {}) {
    const coll = db._collection(collName)
    const selector = getSelector(collName, node, ignoreRevs)
    const prevEvent = getLatestEvent(selector, coll)

    rejectIfIncompatible(REPLACE, prevEvent, selector)

    let result
    if (syncOnly) {
      result = Object.assign(pick(node, '_id', '_key', '_rev'), { new: node, old })
    } else {
      result = coll.replace(selector, node, {
        returnNew: true,
        returnOld: true
      })
    }

    const time = dbtime()
    const event = UPDATED
    const ssData = getTransientOrCreateLatestSnapshot(
      collName,
      prevEvent,
      result.new,
      time
    )

    if (!syncOnly && result.old._rev !== prevEvent.meta.rev) {
      result.old = show(`/n/${selector._id}`, prevEvent.ctime)[0]
    }

    return { result, event, time, prevEvent, ssData }
  }, 'prepReplace', cto)

const prepUpdate = attachSpan(
  function prepUpdate (collName, node, { keepNull = true, mergeObjects = true, ignoreRevs = true } = {}) {
    const coll = db._collection(collName)
    const selector = getSelector(collName, node, ignoreRevs)
    const prevEvent = getLatestEvent(selector, coll)

    rejectIfIncompatible(UPDATE, prevEvent, selector)

    const result = coll.update(selector, node, {
      returnNew: true,
      returnOld: true,
      keepNull,
      mergeObjects
    })

    const time = dbtime()
    const event = UPDATED
    const ssData = getTransientOrCreateLatestSnapshot(
      collName,
      prevEvent,
      result.new,
      time
    )

    if (result.old._rev !== prevEvent.meta.rev) {
      result.old = show(`/n/${selector._id}`, prevEvent.ctime)[0]
    }

    return { result, event, time, prevEvent, ssData }
  }, 'prepUpdate', cto)

const prepRemove = attachSpan(function prepRemove (collName, node, { ignoreRevs = true, syncOnly = false } = {}) {
  const coll = db._collection(collName)
  const selector = getSelector(collName, node, ignoreRevs)
  const prevEvent = getLatestEvent(selector, coll)

  rejectIfIncompatible(REMOVE, prevEvent, selector)

  let result
  if (syncOnly) {
    result = Object.assign(pick(node, '_id', '_key', '_rev'), { old: node })
  } else {
    result = coll.remove(selector, {
      returnOld: true
    })
  }

  const time = dbtime()
  result.new = {}
  const event = DELETED
  const ssData = {
    ssNode: {
      _id: prevEvent['last-snapshot']
    },
    hopsFromLast: prevEvent['hops-from-last-snapshot'] + 1
  }

  if (!syncOnly && result.old._rev !== prevEvent.meta.rev) {
    result.old = show(`/n/${selector._id}`, prevEvent.ctime)[0]
  }

  return { result, event, time, prevEvent, ssData }
}, 'prepRemove', cto)

function metaize (obj) {
  return mapKeys(obj, (v, k) => k.replace(/^_/, ''))
}

const updateSkeletonGraph = attachSpan(function updateSkeletonGraph (evtNode) {
  const nid = evtNode.meta.id
  const [collName, key] = nid.split('/')
  const collType = getCollectionType(collName)

  sgOps[collType][evtNode.event](collName, key, evtNode)
}, 'updateSkeletonGraph', cto)

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
  ensureEventOriginNode,
  getLatestEvent,
  getTransientEventOriginFor,
  getTransientOrCreateLatestSnapshot,
  insertCommandEdge,
  insertEventNode,
  insertEvtSSLink,
  prepInsert,
  prepRestore,
  prepReplace,
  prepUpdate,
  prepRemove,
  metaize,
  updateSkeletonGraph,
  SYNC_MAP,
  getScopeAndSearchPatternFor,
  getScopeFilters
}
