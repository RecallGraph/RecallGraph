'use strict'

const {
  SERVICE_COLLECTIONS,
  snapshotInterval,
  TRANSIENT_EVENT_SUPERNODE,
  SERVICE_GRAPHS,
  COLLECTION_TYPES
} = require('../../helpers')
const { merge, cloneDeep, pick } = require('lodash')
const jiff = require('jiff')
const { db, time: dbtime, errors: ARANGO_ERRORS, query } = require('@arangodb')

const commandColl = db._collection(SERVICE_COLLECTIONS.commands)
const snapshotColl = db._collection(SERVICE_COLLECTIONS.snapshots)
const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const evtSSLinkColl = db._collection(SERVICE_COLLECTIONS.evtSSLinks)
const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
const skeletonEdgesColl = db._collection(SERVICE_COLLECTIONS.skeletonEdges)

const TRANSIENT_SNAPSHOT_ORIGIN = Object.freeze({
  _id: `${snapshotColl.name()}/origin`,
  _key: 'origin',
  'is-origin-node': true,
  'is-virtual': true,
  data: {}
})

const skeletonCollectionTypes = {
  [COLLECTION_TYPES.VERTEX]: skeletonVerticesColl,
  [COLLECTION_TYPES.EDGE]: skeletonEdgesColl
}

exports.TRANSIENT_SNAPSHOT_ORIGIN = TRANSIENT_SNAPSHOT_ORIGIN

function getTransientEventOriginFor (coll) {
  const key = `origin-${coll._id}`

  return {
    _id: `${eventColl.name()}/${key}`,
    _key: key,
    'is-origin-node': true,
    'origin-for': coll.name(),
    meta: {
      'last-snapshot': TRANSIENT_SNAPSHOT_ORIGIN._id,
      'hops-from-last-snapshot': 1,
      'last-snapshot-is-virtual': TRANSIENT_SNAPSHOT_ORIGIN['is-virtual']
    }
  }
}

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
  ctime,
  mtime
) {
  const ssInterval = snapshotInterval(collName)

  let ssNode = null
  let hopsFromLast
  let prevSSid
  let hopsTillNext
  if (ssInterval > 0) {
    const lastMeta = lastEvtNode.meta || {}

    if (
      lastMeta['last-snapshot'] &&
      lastMeta['hops-from-last-snapshot'] < ssInterval
    ) {
      ssNode = {
        _id: lastMeta['last-snapshot']
      }
      hopsFromLast = lastMeta['hops-from-last-snapshot'] + 1
    } else {
      ssNode = {
        meta: { ctime, mtime },
        data: node
      }
      ssNode = snapshotColl.insert(ssNode, { returnNew: true }).new
      hopsFromLast = 1
      prevSSid = lastMeta['last-snapshot']
    }

    hopsTillNext = ssInterval + 2 - hopsFromLast
  }

  return { ssNode, hopsFromLast, hopsTillNext, prevSSid }
}

function getLatestEvent (node, coll) {
  const cursor = query`
    let sv = (
      for e in ${eventColl}
        filter e.meta._id == ${node._id}
        sort e.ctime desc
        limit 1
      return e
    )[0]
    //Now run a traversal with the above node as starting vertex to ensure we get a terminal node,
    //not depending on ctimes being unique.
    for v, e, p in 0..${Number.MAX_SAFE_INTEGER}
      outbound sv
      graph ${SERVICE_GRAPHS.eventLog}
      filter is_same_collection(${SERVICE_COLLECTIONS.events}, v)
      sort length(p) desc
      limit 1
    return p.vertices[-1]
  `

  let latest
  if (cursor.hasNext()) {
    latest = cursor.next()
  } else {
    latest = getTransientEventOriginFor(coll)
  }
  cursor.dispose()

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
    command: jiff.diff(oldNode, newNode)
  }
  if (prevEvent['is-origin-node']) {
    cmdEdge.meta = {
      _id: newNode._id
    }
  }

  return commandColl.insert(cmdEdge, { returnNew: true }).new
}

exports.insertCommandEdge = insertCommandEdge

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

function upsertSkeletonNode (nodeMeta, time) {
  const collName = nodeMeta._id.split('/')[0]
  const collType = db._collection(collName).type()

  const skeletonNode = {
    meta: nodeMeta,
    valid_since: time,
    valid_until: null,
    materialized: []
  }

  if (collType === 3) {
    if (nodeMeta.ghost) {
      Object.assign(skeletonNode, pick(nodeMeta, '_from', '_to'))
    } else {
      let cursor
      for (let ref of ['_from', '_to']) {
        const refCollName = nodeMeta[ref].split('/')[0]
        const refCollType = db._collection(refCollName).type()
        const refColl = skeletonCollectionTypes[refCollType]

        cursor = query`
          for v in ${refColl}
            filter v.meta._id == ${nodeMeta[ref]}
          return v._id
        `

        if (cursor.hasNext()) {
          skeletonNode[ref] = cursor.next()
        } else {
          const ghostMeta = {
            ghost: true,
            _id: nodeMeta[ref],
            _key: nodeMeta[ref].split('/')[1]
          }

          if (db._collection(refCollName).type() === 3) {
            ghostMeta._from = `${skeletonVerticesColl.name()}/0`
            ghostMeta._to = `${skeletonVerticesColl.name()}/0`
          }

          const ghostRef = upsertSkeletonNode(ghostMeta, null)

          skeletonNode[ref] = ghostRef._id
        }

        cursor.dispose()
      }
    }
  }

  const cursor = query`
    upsert {'meta._id': ${nodeMeta._id}}
      insert ${skeletonNode}
      update ${Object.assign({ ghost: null }, pick(skeletonNode, 'meta', 'valid_since'))}
    in ${skeletonCollectionTypes[collType]} options {keepNull: false, mergeObjects: false}
    return NEW
  `

  const newNode = cursor.next()
  cursor.dispose()

  return newNode
}

function expireSkeletonNode (nodeId, time) {
  const collName = nodeId.split('/')[0]
  const collType = db._collection(collName).type()
  const coll = skeletonCollectionTypes[collType]

  const cursor = query`
    for v in ${coll}
      filter v.meta._id == ${nodeId}
      update v with {valid_until: ${time}} in ${coll}
    return NEW
  `

  let newNode = null
  if (cursor.hasNext()) {
    newNode = cursor.next()
  }
  cursor.dispose()

  return newNode
}

exports.ensureEventOriginNode = ensureEventOriginNode

exports.insertEvtSSLink = function insertEvtSSLink (evtNodeId, ssNodeId) {
  const evtSSLinkEdge = {
    _from: evtNodeId,
    _to: ssNodeId
  }

  return evtSSLinkColl.insert(evtSSLinkEdge, { returnNew: true }).new
}

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

  upsertSkeletonNode(pick(result.new, '_id', '_key', '_from', '_to'), time)

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
    prevEvent.ctime,
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
    prevEvent.ctime,
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

  expireSkeletonNode(result._id, time)

  return { result, event, time, prevEvent, ssData }
}
