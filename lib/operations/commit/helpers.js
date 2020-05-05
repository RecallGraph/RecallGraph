'use strict'

const {
  SERVICE_COLLECTIONS, snapshotInterval, TRANSIENT_EVENT_SUPERNODE, getCollectionType, COLLECTION_TYPES,
  getComponentTagOption
} = require('../../helpers')
const { getNonServiceCollections } = require('../helpers')
const { merge, cloneDeep, pick, memoize, mapKeys, intersection, noop } = require('lodash')
const jiff = require('jiff')
const { db, time: dbtime, errors: ARANGO_ERRORS, query } = require('@arangodb')
const { utils: { attachSpan } } = require('foxx-tracing')

const cto = getComponentTagOption(__filename)

const commandColl = db._collection(SERVICE_COLLECTIONS.commands)
const snapshotColl = db._collection(SERVICE_COLLECTIONS.snapshots)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const evtSSLinkColl = db._collection(SERVICE_COLLECTIONS.evtSSLinks)
const snapshotLinkColl = db._collection(SERVICE_COLLECTIONS.snapshotLinks)
const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
const skeletonEdgeHubsColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeHubs)
const skeletonEdgeSpokesColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeSpokes)

const sgOps = {
  [COLLECTION_TYPES.VERTEX]: {
    created: (collName, key, evtNode) => {
      const _key = `${collName}.${key}`

      skeletonVerticesColl.insert({ _key, valid_since: evtNode.ctime, meta: pick(evtNode.meta, 'id', 'key') })
    },
    deleted: (collName, key, evtNode) => {
      const _key = `${collName}.${key}`

      skeletonVerticesColl.update(_key, { valid_until: evtNode.ctime })
    },
    updated: noop
  },
  [COLLECTION_TYPES.EDGE]: {
    created: (collName, key, evtNode) => {
      const skCollMap = getSkCollMap()
      const _key = `${collName}.${key}`
      const hub = skeletonEdgeHubsColl.insert({
        _key,
        valid_since: evtNode.ctime,
        meta: pick(evtNode.meta, 'id', 'key', 'from', 'to')
      })._id

      const [fCollName, fKey] = evtNode.meta.from.split('/')
      const fromKey = `${fCollName}.${fKey}`
      const _from = `${skCollMap[fCollName]}/${fromKey}`
      const [tCollName, tKey] = evtNode.meta.to.split('/')
      const toKey = `${tCollName}.${tKey}`
      const _to = `${skCollMap[tCollName]}/${toKey}`

      skeletonEdgeSpokesColl.insert([
        { hub, valid_since: evtNode.ctime, _from, _to: hub },
        { hub, valid_since: evtNode.ctime, _from: hub, _to }
      ])
    },
    deleted: (collName, key, evtNode) => {
      const hid = `${SERVICE_COLLECTIONS.skeletonEdgeHubs}/${collName}.${key}`
      const uFields = { valid_until: evtNode.ctime }

      skeletonEdgeHubsColl.update(hid, uFields)
      skeletonEdgeSpokesColl.updateByExample({ hub: hid, valid_until: null }, uFields)
    },
    updated: (collName, key, evtNode) => {
      if (intersection(Object.keys(evtNode.meta), ['fromNew', 'toNew']).length) {
        const skCollMap = getSkCollMap()
        const hub = `${SERVICE_COLLECTIONS.skeletonEdgeHubs}/${collName}.${key}`
        const edges = skeletonEdgeSpokesColl.byExample({ hub, valid_until: null }).toArray()
        const uFields = { valid_until: evtNode.ctime }
        const inserts = []
        const updateKeys = []
        const updateValues = []

        if (evtNode.meta.fromNew) {
          const edge = edges.find(e => e._to === hub)
          updateKeys.push(edge._key)
          updateValues.push(uFields)

          const [fCollName, fKey] = evtNode.meta.fromNew.split('/')
          const fromKey = `${fCollName}.${fKey}`
          const _from = `${skCollMap[fCollName]}/${fromKey}`

          inserts.push({ hub, valid_since: evtNode.ctime, _from, _to: hub })
        }

        if (evtNode.meta.toNew) {
          const edge = edges.find(e => e._from === hub)
          updateKeys.push(edge._key)
          updateValues.push(uFields)

          const [tCollName, tKey] = evtNode.meta.toNew.split('/')
          const toKey = `${tCollName}.${tKey}`
          const _to = `${skCollMap[tCollName]}/${toKey}`

          inserts.push({ hub, valid_since: evtNode.ctime, _from: hub, _to })
        }

        skeletonEdgeSpokesColl.insert(inserts)
        skeletonEdgeSpokesColl.update(updateKeys, updateValues)
      }
    }
  }
}

function getSkCollMap () {
  const edgeCollections = getNonServiceCollections().filter(coll => getCollectionType(coll) === COLLECTION_TYPES.EDGE)
  const vertexCollections = getNonServiceCollections().filter(
    coll => getCollectionType(coll) === COLLECTION_TYPES.VERTEX)

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

const getTransientEventOriginFor = memoize(coll => {
  const key = `origin-${coll._id}`
  const snapshot = getTransientSnapshotOriginFor(coll)

  return {
    _id: `${eventColl.name()}/${key}`,
    _key: key,
    'is-origin-node': true,
    'collection': coll.name(),
    meta: {},
    'last-snapshot': snapshot._id,
    'hops-from-last-snapshot': 1,
    'hops-from-origin': 0
  }
}, coll => coll.name())

function ensureEventSupernode () {
  if (!eventColl.exists(TRANSIENT_EVENT_SUPERNODE)) {
    try {
      eventColl.insert(TRANSIENT_EVENT_SUPERNODE, {
        waitForSync: true,
        silent: true
      })
    } catch (e) {
      if (
        e.errorNum !==
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      ) {
        throw e
      }
    }
  }
}

function getTransientOrCreateLatestSnapshot (
  collName,
  lastEvtNode,
  node,
  ctime
) {
  const ssInterval = snapshotInterval(collName)

  let ssNode = null
  let hopsFromLast
  let prevSSid
  let hopsTillNext
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

    hopsTillNext = ssInterval + 2 - hopsFromLast
  }

  return { ssNode, hopsFromLast, hopsTillNext, prevSSid }
}

function getLatestEvent (node, coll) {
  let latest

  // const eventList = log(`/n/${node._id}`, { limit: 1, sort: 'desc' })
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
}

exports.getTransientEventOriginFor = attachSpan(getTransientEventOriginFor, 'getTransientEventOriginFor', cto)
exports.getTransientOrCreateLatestSnapshot = attachSpan(getTransientOrCreateLatestSnapshot,
  'getTransientOrCreateLatestSnapshot', cto)
exports.getLatestEvent = attachSpan(getLatestEvent, 'getLatestEvent', cto)

exports.insertEventNode = attachSpan(function insertEventNode (nodeMeta, time, event, ssData, prevEvent, collName) {
  if (prevEvent['is-origin-node']) {
    event = 'created'
  }

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
      'hops-till-next-snapshot': ssData.hopsTillNext,
      'hops-from-origin': prevEvent['hops-from-origin'] + 1
    })
  }

  return eventColl.insert(evtNode, { returnNew: true }).new
}, 'insertEventNode', cto)

function insertCommandEdge (prevEvent, evtNode, oldNode, newNode) {
  if (prevEvent['is-origin-node']) {
    oldNode = {}
  }

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
}

exports.insertCommandEdge = attachSpan(insertCommandEdge, 'insertCommandEdge', cto)

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

function ensureEventOriginNode (collName) {
  ensureEventSupernode()
  const coll = db._collection(collName)
  const origin = getTransientEventOriginFor(coll)

  if (!eventColl.exists(origin)) {
    try {
      eventColl.insert(origin, {
        waitForSync: true,
        silent: true
      })

      insertCommandEdge(TRANSIENT_EVENT_SUPERNODE, origin, {}, {})

      const snapshotOrigin = ensureSnapshotOriginNode(collName)
      insertEvtSSLink(origin._id, snapshotOrigin._id)
    } catch (e) {
      if (
        e.errorNum !==
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      ) {
        throw e
      }
    }
  }
}

exports.ensureEventOriginNode = attachSpan(ensureEventOriginNode, 'ensureEventOriginNode', cto)

function insertSnapshotLink (fromSSNodeId, toSSNodeId) {
  const snapshotLinkEdge = {
    _from: fromSSNodeId,
    _to: toSSNodeId
  }

  return snapshotLinkColl.insert(snapshotLinkEdge, { returnNew: true }).new
}

function insertEvtSSLink (evtNodeId, ssNodeId) {
  const evtSSLinkEdge = {
    _from: evtNodeId,
    _to: ssNodeId
  }

  return evtSSLinkColl.insert(evtSSLinkEdge, { returnNew: true }).new
}

exports.insertEvtSSLink = attachSpan(insertEvtSSLink, 'insertEvtSSLink', cto)

exports.prepInsert = attachSpan(function prepInsert (collName, node) {
  if (node._id || node._key) {
    const nid = node._id || `${collName}/${node._key}`
    const event = eventColl.firstExample('meta.id', nid, 'event', 'deleted')
    if (event) {
      const e = new Error(
        `Event log found for node with _id: ${nid}. Undelete to reuse, or specify a new id/key.`
      )
      e.errorNum = ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      e.errorMessage = e.message

      throw e
    }
  }

  const coll = db._collection(collName)
  const result = coll.insert(node, {
    returnNew: true
  })
  const time = dbtime()
  result.old = {}
  const event = 'created'
  const prevEvent = getTransientEventOriginFor(coll)
  const ssData = getTransientOrCreateLatestSnapshot(
    collName,
    prevEvent,
    result.new,
    time
  )

  ensureEventOriginNode(collName)

  return { result, event, time, prevEvent, ssData }
}, 'prepInsert', cto)

exports.prepReplace = attachSpan(function prepReplace (collName, node, { ignoreRevs = true } = {}) {
  const selectorKeys = ['_key', '_id']
  if (!ignoreRevs) {
    selectorKeys.push('_rev')
  }

  const coll = db._collection(collName)
  const result = coll.replace(pick(node, selectorKeys), node, {
    returnNew: true,
    returnOld: true
  })
  const time = dbtime()
  const event = 'updated'
  const prevEvent = getLatestEvent(result, coll)
  const ssData = getTransientOrCreateLatestSnapshot(
    collName,
    prevEvent,
    result.new,
    time
  )

  return { result, event, time, prevEvent, ssData }
}, 'prepReplace', cto)

exports.prepUpdate = attachSpan(
  function prepUpdate (collName, node, { keepNull = true, mergeObjects = true, ignoreRevs = true } = {}) {
    const selectorKeys = ['_key', '_id']
    if (!ignoreRevs) {
      selectorKeys.push('_rev')
    }

    const coll = db._collection(collName)
    const result = coll.update(pick(node, selectorKeys), node, {
      returnNew: true,
      returnOld: true,
      keepNull,
      mergeObjects
    })
    const time = dbtime()
    const event = 'updated'
    const prevEvent = getLatestEvent(result, coll)
    const ssData = getTransientOrCreateLatestSnapshot(
      collName,
      prevEvent,
      result.new,
      time
    )

    return { result, event, time, prevEvent, ssData }
  }, 'prepUpdate', cto)

exports.prepRemove = attachSpan(function prepRemove (collName, node, { ignoreRevs = true } = {}) {
  const selectorKeys = ['_key', '_id']
  if (!ignoreRevs) {
    selectorKeys.push('_rev')
  }

  const coll = db._collection(collName)
  const result = coll.remove(pick(node, selectorKeys), {
    returnOld: true
  })
  const time = dbtime()
  result.new = {}
  const event = 'deleted'
  const prevEvent = getLatestEvent(result, coll)
  const ssData = {
    ssNode: {
      _id: prevEvent['last-snapshot']
    },
    hopsFromLast: prevEvent['hops-from-last-snapshot'] + 1
  }

  return { result, event, time, prevEvent, ssData }
}, 'prepRemove', cto)

function metaize (obj) {
  return mapKeys(obj, (v, k) => k.replace(/^_/, ''))
}

exports.metaize = metaize

exports.updateSkeletonGraph = attachSpan(function updateSkeletonGraph (evtNode) {
  const nid = evtNode.meta.id
  const [collName, key] = nid.split('/')
  const collType = getCollectionType(collName)

  sgOps[collType][evtNode.event](collName, key, evtNode)
}, 'updateSkeletonGraph', cto)
