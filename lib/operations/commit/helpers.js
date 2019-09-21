'use strict'

const {
  SERVICE_COLLECTIONS,
  snapshotInterval,
  TRANSIENT_EVENT_SUPERNODE
} = require('../../helpers')
const log = require('../log')

const { merge, cloneDeep, pick, memoize } = require('lodash')
const jiff = require('jiff')

const { db, time: dbtime, errors: ARANGO_ERRORS } = require('@arangodb')

const commandColl = db._collection(SERVICE_COLLECTIONS.commands)
const snapshotColl = db._collection(SERVICE_COLLECTIONS.snapshots)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const evtSSLinkColl = db._collection(SERVICE_COLLECTIONS.evtSSLinks)
const snapshotLinkColl = db._collection(SERVICE_COLLECTIONS.snapshotLinks)

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
    'origin-for': coll.name(),
    meta: {},
    'last-snapshot': snapshot._id,
    'hops-from-last-snapshot': 1
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

  const eventList = log(`/n/${node._id}`, { limit: 1, sort: 'desc' })
  // noinspection JSUnresolvedVariable
  if (eventList.length) {
    latest = eventList[0]
  } else {
    latest = getTransientEventOriginFor(coll)
  }

  return latest
}

exports.getTransientEventOriginFor = getTransientEventOriginFor
exports.getTransientOrCreateLatestSnapshot = getTransientOrCreateLatestSnapshot
exports.getLatestEvent = getLatestEvent

exports.insertEventNode = function insertEventNode (
  nodeMeta,
  time,
  event,
  ssData
) {
  const evtNode = {
    meta: cloneDeep(nodeMeta),
    ctime: time,
    event
  }

  if (ssData.ssNode) {
    merge(evtNode, {
      'last-snapshot': ssData.ssNode._id,
      'hops-from-last-snapshot': ssData.hopsFromLast,
      'hops-till-next-snapshot': ssData.hopsTillNext
    })
  }

  return eventColl.insert(evtNode, { returnNew: true }).new
}

function insertCommandEdge (prevEvent, evtNode, oldNode, newNode) {
  const cmdEdge = {
    _from: prevEvent._id,
    _to: evtNode._id,
    command: jiff.diff(oldNode, newNode, {})
  }
  if (prevEvent['is-origin-node']) {
    cmdEdge.meta = {
      _id: newNode._id
    }
  }

  return commandColl.insert(cmdEdge, { returnNew: true }).new
}

exports.insertCommandEdge = insertCommandEdge

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

exports.ensureEventOriginNode = ensureEventOriginNode

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

exports.insertEvtSSLink = insertEvtSSLink

exports.prepInsert = function prepInsert (collName, node) {
  if (node._id || node._key) {
    const nid = node._id || `${collName}/${node._key}`
    const event = eventColl.firstExample('meta._id', nid, 'event', 'deleted')
    if (event) {
      const e = new Error(
        `Event log found for node with _id: ${nid}. Undelete to reuse, or specify a new id/key.`
      )
      // noinspection JSUndefinedPropertyAssignment
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
}

exports.prepReplace = function prepReplace (
  collName,
  node,
  { ignoreRevs = true } = {}
) {
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
}

exports.prepUpdate = function prepUpdate (
  collName,
  node,
  { keepNull = true, mergeObjects = true, ignoreRevs = true } = {}
) {
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
}

exports.prepRemove = function prepRemove (
  collName,
  node,
  { ignoreRevs = true } = {}
) {
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
}
