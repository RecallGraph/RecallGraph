'use strict'

const {
  SERVICE_COLLECTIONS, snapshotInterval, TRANSIENT_EVENT_SUPERNODE, getCollectionType, COLLECTION_TYPES,
  getComponentTagOption, DB_OPS: { REMOVE, REPLACE, UPDATE, INSERT, RESTORE }
} = require('../../helpers')
const { getNonServiceCollections } = require('../helpers')
const { merge, cloneDeep, pick, memoize, mapKeys, intersection, noop, filter, last } = require('lodash')
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
  [COLLECTION_TYPES.EDGE]: {
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
  const id = `${eventColl.name()}/${key}`

  return {
    _id: id,
    _key: key,
    'is-origin-node': true,
    collection: coll.name(),
    meta: { id },
    event: 'collInit',
    'last-snapshot': snapshot._id,
    'hops-from-last-snapshot': 1,
    'hops-from-origin': 0
  }
}, coll => coll.name())

function ensureEventSupernode () {
  if (!eventColl.exists(TRANSIENT_EVENT_SUPERNODE)) {
    try {
      const superOrigin = Object.assign({ ctime: dbtime(), TRANSIENT_EVENT_SUPERNODE })
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
}

function getLatestEvent (node, coll) {
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

function rejectIfOrigin (prevEvent, selector) {
  if (prevEvent['is-origin-node']) {
    const e = new Error(
      `Event log not found for node with _id: ${selector._id}. Run \`sync\` first to make the event log catch up.`
    )
    e.errorNum = ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
    e.errorMessage = e.message

    throw e
  }
}

function rejectIfDuplicateOp (preEvent, selector, op) {
  if (preEvent.meta.rev === selector._rev) {
    const e = new Error(
      `Duplicate operation attempted for ${selector._id}. Op: ${op}`
    )
    e.errorNum = ARANGO_ERRORS.ERROR_ARANGO_DUPLICATE_IDENTIFIER.code
    e.errorMessage = e.message

    throw e
  }
}

exports.getTransientEventOriginFor = attachSpan(getTransientEventOriginFor, 'getTransientEventOriginFor', cto)
exports.getTransientOrCreateLatestSnapshot = attachSpan(getTransientOrCreateLatestSnapshot,
  'getTransientOrCreateLatestSnapshot', cto)
exports.getLatestEvent = attachSpan(getLatestEvent, 'getLatestEvent', cto)

exports.insertEventNode = attachSpan(function insertEventNode (nodeMeta, time, event, ssData, prevEvent, collName) {
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

function insertCommandEdge (prevEvent, evtNode, oldNode, newNode) {
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

function ensureEventOriginNode (collName) {
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

exports.prepInsert = attachSpan(function prepInsert (collName, node, { syncOnly = false } = {}) {
  if (!syncOnly && (node._id || node._key)) {
    const nid = node._id || `${collName}/${node._key}`
    const event = eventColl.firstExample('meta.id', nid, 'event', 'deleted')
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
  const event = 'created'
  const prevEvent = getLatestEvent(result, coll)
  rejectIfDuplicateOp(prevEvent, result, INSERT)

  const ssData = getTransientOrCreateLatestSnapshot(
    collName,
    prevEvent,
    result.new,
    time
  )

  ensureEventOriginNode(collName)

  return { result, event, time, prevEvent, ssData }
}, 'prepInsert', cto)

exports.prepRestore = attachSpan(function prepRestore (collName, node, { syncOnly = false } = {}) {
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
  const event = 'restored'
  const prevEvent = getLatestEvent(result, coll)
  rejectIfDuplicateOp(prevEvent, result, RESTORE)

  const ssData = getTransientOrCreateLatestSnapshot(
    collName,
    prevEvent,
    result.new,
    time
  )

  ensureEventOriginNode(collName)

  return { result, event, time, prevEvent, ssData }
}, 'prepRestore', cto)

exports.prepReplace = attachSpan(
  function prepReplace (collName, node, { ignoreRevs = true, syncOnly = false, old = null } = {}) {
    const coll = db._collection(collName)
    const selector = getSelector(collName, node, ignoreRevs)
    const prevEvent = getLatestEvent(selector, coll)

    rejectIfDuplicateOp(prevEvent, selector, REPLACE)
    rejectIfOrigin(prevEvent, selector)

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
    const event = 'updated'
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
    const coll = db._collection(collName)
    const selector = getSelector(collName, node, ignoreRevs)
    const prevEvent = getLatestEvent(selector, coll)

    rejectIfDuplicateOp(prevEvent, selector, UPDATE)
    rejectIfOrigin(prevEvent, selector)

    const result = coll.update(selector, node, {
      returnNew: true,
      returnOld: true,
      keepNull,
      mergeObjects
    })

    const time = dbtime()
    const event = 'updated'
    const ssData = getTransientOrCreateLatestSnapshot(
      collName,
      prevEvent,
      result.new,
      time
    )

    return { result, event, time, prevEvent, ssData }
  }, 'prepUpdate', cto)

exports.prepRemove = attachSpan(function prepRemove (collName, node, { ignoreRevs = true, syncOnly = false } = {}) {
  const coll = db._collection(collName)
  const selector = getSelector(collName, node, ignoreRevs)
  const prevEvent = getLatestEvent(selector, coll)

  rejectIfDuplicateOp(prevEvent, selector, REMOVE)
  rejectIfOrigin(prevEvent, selector)

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
  const event = 'deleted'
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
