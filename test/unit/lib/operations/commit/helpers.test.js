/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/util/init')
const {
  getLatestEvent,
  getTransientOrCreateLatestSnapshot,
  getTransientEventOriginFor,
  insertEventNode,
  insertCommandEdge,
  insertEvtSSLink,
  ensureEventOriginNode,
  prepInsert,
  prepRemove,
  prepReplace,
  prepUpdate,
  metaize
} = require('../../../../../lib/operations/commit/helpers')
const {
  createSingle,
  createMultiple
} = require('../../../../../lib/handlers/createHandlers')
const {
  replaceSingle
} = require('../../../../../lib/handlers/replaceHandlers')
const { removeSingle } = require('../../../../../lib/handlers/removeHandlers')

const { db, errors: ARANGO_ERRORS, time: dbtime } = require('@arangodb')
const {
  SERVICE_COLLECTIONS,
  snapshotInterval
} = require('../../../../../lib/helpers')

const { omit, pick, mapValues } = require('lodash')
const jiff = require('jiff')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)

describe('Commit Helpers - getLatestEvent', () => {
  before(init.setup)

  after(init.teardown)

  it('should return the origin event for a non-existent node', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex)
    const node = {
      _id: 'does-not-exist',
      src: `${__filename}:should return the origin event for a non-existent node`
    }
    const origin = getTransientEventOriginFor(coll)
    const latestEvent = getLatestEvent(node, coll)

    expect(latestEvent).to.be.an.instanceOf(Object)
    expect(latestEvent).to.deep.equal(origin)
  })

  it('should return the origin event for a non-committed but persisted node', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex)
    const node = coll.insert({
      src: `${__filename}:should return the origin event for a non-committed but persisted node`
    })
    const origin = getTransientEventOriginFor(coll)
    const latestEvent = getLatestEvent(node, coll)

    expect(latestEvent).to.be.an.instanceOf(Object)
    expect(latestEvent).to.deep.equal(origin)
  })

  it('should return a \'create\' event node for a node created through service', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      src: `${__filename}:should return a 'create' event node for a node created through service`
    }
    const node = createSingle({ pathParams, body })
    const latestEvent = getLatestEvent(node, coll)

    expect(latestEvent).to.be.an.instanceOf(Object)
    expect(latestEvent.meta).to.be.an.instanceOf(Object)
    expect(latestEvent.event).to.equal('created')
    expect(latestEvent.meta.id).to.equal(node._id)
    expect(latestEvent).to.have.property('ctime')
  })

  it('should return an \'update\' event node for a committed node replaced through service', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      src: `${__filename}:should return an 'update' event node for a committed node replaced through service`
    }
    let node = createSingle({ pathParams, body }, { returnNew: true }).new
    node.k1 = 'v1'
    node = replaceSingle({ pathParams, body: node })

    const latestEvent = getLatestEvent(node, coll)

    expect(latestEvent).to.be.an.instanceOf(Object)
    expect(latestEvent.meta).to.be.an.instanceOf(Object)
    expect(latestEvent.event).to.equal('updated')
    expect(latestEvent.meta.id).to.equal(node._id)
    expect(latestEvent).to.have.property('ctime')
  })

  it('should return an \'update\' event node for a non-committed node replaced through service', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    let node = coll.insert(
      {
        src: `${__filename}:should return an 'update' event node for a non-committed node replaced through service`
      },
      { returnNew: true }
    ).new
    node.k1 = 'v1'
    node = replaceSingle({ pathParams, body: node })

    const latestEvent = getLatestEvent(node, coll)

    expect(latestEvent).to.be.an.instanceOf(Object)
    expect(latestEvent.meta).to.be.an.instanceOf(Object)
    expect(latestEvent.event).to.equal('updated')
    expect(latestEvent.meta.id).to.equal(node._id)
    expect(latestEvent).to.have.property('ctime')
  })
})

describe('Commit Helpers - getTransientOrCreateLatestSnapshot', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a new snapshot node for a non-committed but persisted node', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex)
    const node = coll.insert({
      src: `${__filename}:should return a new snapshot node for a non-committed but persisted node`
    })
    const latestEvent = getLatestEvent(node, coll)
    const ssData = getTransientOrCreateLatestSnapshot(
      coll.name(),
      latestEvent,
      node
    )
    const ssNode = ssData.ssNode

    expect(ssNode).to.be.an.instanceOf(Object)
    expect(ssData.hopsFromLast).to.equal(2)
    expect(ssData.prevSSid).to.be.undefined
  })
})

describe('Commit Helpers - insertEventNode', () => {
  before(init.setup)

  after(init.teardown)

  it('should return an event node for \'created\' event', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex)
    const node = coll.insert({
      src: `${__filename}:should return an event node for 'created' event`
    })
    const time = dbtime()
    const latestEvent = getLatestEvent(node, coll)
    const ssData = getTransientOrCreateLatestSnapshot(
      coll.name(),
      latestEvent,
      node,
      time
    )
    const evtNode = insertEventNode(node, time, 'created', ssData, latestEvent)

    // Cleanup: Orphaned event nodes should not exist
    eventColl.remove(evtNode)

    expect(evtNode).to.be.an.instanceOf(Object)
    expect(evtNode).to.have.property('_id')
    expect(evtNode).to.have.property('_key')
    expect(evtNode).to.have.property('_rev')
    expect(evtNode.meta).to.be.an.instanceOf(Object)
    Object.keys(node).forEach(key =>
      expect(evtNode.meta[key.replace(/^_/, '')]).to.deep.equal(node[key])
    )
    expect(evtNode.event).to.equal('created')
    expect(evtNode.ctime).to.equal(time)
    expect(evtNode['last-snapshot']).to.equal(ssData.ssNode._id)
    expect(evtNode['hops-from-last-snapshot']).to.equal(ssData.hopsFromLast)
    expect(evtNode['hops-from-origin']).to.equal(latestEvent['hops-from-origin'] + 1)
  })

  it('should return an event node for \'updated\' event', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex)
    let node = coll.insert(
      {
        src: `${__filename}:should return an event node for 'updated' event`
      },
      { returnNew: true }
    ).new
    const ctime = dbtime()
    const latestEvent = getLatestEvent(node, coll)
    let ssData = getTransientOrCreateLatestSnapshot(
      coll.name(),
      latestEvent,
      node,
      ctime
    )
    const cEvtNode = insertEventNode(node, ctime, 'created', ssData, latestEvent)

    node.k1 = 'v1'
    node = coll.replace(node._id, node)
    const mtime = dbtime()
    ssData = getTransientOrCreateLatestSnapshot(
      coll.name(),
      cEvtNode,
      node,
      ctime
    )
    const rEvtNode = insertEventNode(node, mtime, 'updated', ssData, cEvtNode)

    // Cleanup: Orphaned event nodes should not exist
    eventColl.remove([cEvtNode, rEvtNode])

    expect(rEvtNode).to.be.an.instanceOf(Object)
    expect(rEvtNode).to.have.property('_id')
    expect(rEvtNode).to.have.property('_key')
    expect(rEvtNode).to.have.property('_rev')
    expect(rEvtNode.meta).to.be.an.instanceOf(Object)
    Object.keys(node).forEach(key =>
      expect(rEvtNode.meta[key.replace(/^_/, '')]).to.deep.equal(node[key])
    )
    expect(rEvtNode.event).to.equal('updated')
    expect(rEvtNode.ctime).to.equal(mtime)
    expect(rEvtNode['last-snapshot']).to.equal(ssData.ssNode._id)
    expect(rEvtNode['hops-from-last-snapshot']).to.equal(ssData.hopsFromLast)
  })
})

describe('Commit Helpers - insertCommandEdge', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a new command edge', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex)
    const node = coll.insert(
      {
        k1: 'v1',
        src: `${__filename}:should return a new command edge`
      },
      { returnNew: true }
    )
    node.old = {}
    const ctime = new Date()
    const latestEvent = getLatestEvent(node, coll)
    const ssData = getTransientOrCreateLatestSnapshot(
      coll.name(),
      latestEvent,
      node.new,
      ctime
    )
    const evtNode = insertEventNode(
      omit(node, 'new'),
      ctime,
      'created',
      ssData,
      latestEvent
    )

    const enode = insertCommandEdge(latestEvent, evtNode, node.old, node.new)

    expect(enode).to.be.an.instanceOf(Object)
    expect(enode).to.have.property('_id')
    expect(enode).to.have.property('_key')
    expect(enode).to.have.property('_rev')
    expect(enode._from).to.equal(latestEvent._id)
    expect(enode._to).to.equal(evtNode._id)
    expect(enode.command).to.deep.equal(jiff.diff(node.old, node.new))
  })
})

describe('Commit Helpers - insertEvtSSLink', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a new event-snapshot link', () => {
    const evtSSCollName = SERVICE_COLLECTIONS.evtSSLinks
    const [evtNodeId, ssNodeId] = [`${evtSSCollName}/void-1`, `${evtSSCollName}/void-2`]
    const enode = insertEvtSSLink(evtNodeId, ssNodeId)

    expect(enode).to.be.an.instanceOf(Object)
    expect(enode).to.have.property('_id')
    expect(enode).to.have.property('_key')
    expect(enode).to.have.property('_rev')
    expect(enode._from).to.equal(evtNodeId)
    expect(enode._to).to.equal(ssNodeId)
  })
})

describe('Commit Helpers - ensureEventOriginNode', () => {
  before(init.setup)

  after(init.teardown)

  it('should ensure presence of an event origin node', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex)
    const eventColl = db._collection(SERVICE_COLLECTIONS.events)
    const origin = getTransientEventOriginFor(coll)

    ensureEventOriginNode(coll.name())
    const node = eventColl.document(origin._id)

    expect(node).to.be.an.instanceOf(Object)
    Object.keys(origin).forEach(key =>
      expect(node[key]).to.deep.equal(origin[key])
    )
    expect(node).to.have.property('_rev')
  })
})

describe('Commit Helpers - getTransientEventOriginFor', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a transient origin node', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex)
    const key = `origin-${coll._id}`
    const expectedOrigin = {
      _id: `${SERVICE_COLLECTIONS.events}/${key}`,
      _key: key,
      'is-origin-node': true,
      'collection': coll.name(),
      'hops-from-last-snapshot': 1,
      'hops-from-origin': 0
    }

    const origin = getTransientEventOriginFor(coll)

    Object.keys(expectedOrigin).forEach(key =>
      expect(origin[key]).to.equal(expectedOrigin[key])
    )
  })
})

describe('Commit Helpers - prepInsert', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a meta node after inserting a vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should return a meta node after inserting a vertex`
    }

    const { result, event, time, prevEvent, ssData } = prepInsert(
      collName,
      node
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result).to.have.property('_id')
    expect(result).to.have.property('_key')
    expect(result).to.have.property('_rev')
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new.k1).to.equal('v1')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old).to.be.empty

    expect(event).to.equal('created')
    expect(typeof time).to.equal('number')

    const coll = db._collection(collName)
    const eventOriginNode = getTransientEventOriginFor(coll)
    expect(prevEvent).to.deep.equal(eventOriginNode)

    const snapshotOriginData = getTransientOrCreateLatestSnapshot(
      collName,
      prevEvent,
      node,
      time
    )
    expect(ssData).to.deep.equal(snapshotOriginData)
  })

  it('should fail when trying to insert a duplicate vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const pathParams = {
      collection: collName
    }
    const body = {
      src: `${__filename}:should fail when trying to insert a duplicate vertex`
    }
    const node = createSingle({ pathParams, body }, { returnNew: true }).new

    expect(() => prepInsert(collName, node))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      )
  })

  it('should fail when trying to insert a vertex with the same id as a deleted vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const pathParams = {
      collection: collName
    }
    const body = {
      src: `${__filename}:should fail when trying to insert a vertex with the same id as a deleted vertex`
    }
    const node = createSingle({ pathParams, body }, { returnNew: true }).new
    removeSingle({ pathParams, body: node })

    expect(() => prepInsert(collName, node)).to.throw(
      `Event log found for node with _id: ${node._id}`
    )
  })

  it('should return a meta node after inserting an edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after inserting an edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after inserting an edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const enode = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should return a meta node after inserting an edge`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    const { result, event, time, prevEvent, ssData } = prepInsert(
      collName,
      enode
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result).to.have.property('_id')
    expect(result).to.have.property('_key')
    expect(result).to.have.property('_rev')
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new._from).to.equal(vnodes[0]._id)
    expect(result.new._to).to.equal(vnodes[1]._id)
    expect(result.new.k1).to.equal('v1')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old).to.be.empty

    expect(event).to.equal('created')
    expect(typeof time).to.equal('number')

    const coll = db._collection(collName)
    const eventOriginNode = getTransientEventOriginFor(coll)
    expect(prevEvent).to.deep.equal(eventOriginNode)

    const snapshotOriginData = getTransientOrCreateLatestSnapshot(
      collName,
      prevEvent,
      enode,
      time
    )
    expect(ssData).to.deep.equal(snapshotOriginData)
  })

  it('should fail when trying to insert a duplicate edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when trying to insert a duplicate edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when trying to insert a duplicate edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when trying to insert a duplicate edge`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const enode = createSingle({ pathParams, body: ebody }, { returnNew: true })
      .new

    expect(() => prepInsert(pathParams.collection, enode))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      )
  })

  it('should fail when trying to insert an edge with same id as a deleted edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when trying to insert an edge with same id as a deleted edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when trying to insert an edge with same id as a deleted edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when trying to insert an edge with same id as a deleted edge`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const enode = createSingle({ pathParams, body: ebody }, { returnNew: true })
      .new
    removeSingle({ pathParams, body: enode })

    expect(() => prepInsert(pathParams.collection, enode)).to.throw(
      `Event log found for node with _id: ${enode._id}`
    )
  })
})

describe('Commit Helpers - prepReplace', () => {
  before(init.setup)

  after(init.teardown)

  it('should fail when ignoreRevs is false and _rev match fails in vertex node', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in vertex node`
    }

    const node = createSingle({ pathParams, body }, { returnNew: true }).new
    node.k1 = 'v2'
    node._rev = 'mismatched_rev'

    expect(() => prepReplace(collName, node, { ignoreRevs: false }))
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should return a meta node after replacing a vertex, when ignoreRevs is false, and _rev matches', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should return a meta node after replacing a vertex, when ignoreRevs is false, and _rev matches`
    }
    const node = createSingle({ pathParams, body }, { returnNew: true }).new
    node.k1 = 'v2'

    const { result, event, time, prevEvent, ssData } = prepReplace(
      collName,
      node,
      { ignoreRevs: false }
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(node._id)
    expect(result._key).to.equal(node._key)
    expect(result._rev).to.not.equal(node._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new.k1).to.equal('v2')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old._rev).to.equal(node._rev)
    expect(result.old.k1).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(collName)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should return a meta node after replacing a vertex, when ignoreRevs is true, irrespective of _rev match', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should return a meta node after replacing a vertex, when ignoreRevs is true, irrespective of _rev match`
    }
    const node = createSingle({ pathParams, body }, { returnNew: true }).new
    node.k1 = 'v2'
    node._rev = 'mismatched_rev'

    const { result, event, time, prevEvent, ssData } = prepReplace(
      collName,
      node
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(node._id)
    expect(result._key).to.equal(node._key)
    expect(result._rev).to.not.equal(node._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new.k1).to.equal('v2')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old.k1).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(collName)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should fail when trying to replace a non-existent vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      _key: 'does-not-exist',
      src: `${__filename}:should fail when trying to replace a non-existent vertex`
    }

    expect(() => prepReplace(collName, node))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })

  it('should fail when ignoreRevs is false and _rev match fails in edge node', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in edge node`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in edge node`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in edge node`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode.k1 = 'v2'
    ecnode._rev = 'mismatched_rev'

    expect(() =>
      prepReplace(pathParams.collection, ecnode, { ignoreRevs: false })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should return a meta node after replacing a edge, when ignoreRevs is false, and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after replacing an edge, when ignoreRevs is false, and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after replacing an edge, when ignoreRevs is false, and _rev matches`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should return a meta node after replacing an edge, when ignoreRevs is false, and _rev matches`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode.k1 = 'v2'

    const { result, event, time, prevEvent, ssData } = prepReplace(
      pathParams.collection,
      ecnode,
      { ignoreRevs: false }
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(ecnode._id)
    expect(result._key).to.equal(ecnode._key)
    expect(result._rev).to.not.equal(ecnode._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new._from).to.equal(ecnode._from)
    expect(result.new._to).to.equal(ecnode._to)
    expect(result.new.k1).to.equal('v2')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old._rev).to.equal(ecnode._rev)
    expect(result.old._from).to.equal(ecnode._from)
    expect(result.old._to).to.equal(ecnode._to)
    expect(result.old.k1).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const coll = db._collection(pathParams.collection)
    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(pathParams.collection)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should return a meta node after replacing an edge, when ignoreRevs is true, irrespective of _rev match', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after replacing an edge, when ignoreRevs is true, irrespective of _rev match`
      },
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after replacing an edge, when ignoreRevs is true, irrespective of _rev match`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should return a meta node after replacing an edge, when ignoreRevs is true, irrespective of _rev match`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode.k1 = 'v2'
    ecnode._rev = 'mismatched_rev'

    const { result, event, time, prevEvent, ssData } = prepReplace(
      pathParams.collection,
      ecnode
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(ecnode._id)
    expect(result._key).to.equal(ecnode._key)
    expect(result._rev).to.not.equal(ecnode._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new._from).to.equal(ecnode._from)
    expect(result.new._to).to.equal(ecnode._to)
    expect(result.new.k1).to.equal('v2')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old._from).to.equal(ecnode._from)
    expect(result.old._to).to.equal(ecnode._to)
    expect(result.old.k1).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const coll = db._collection(pathParams.collection)
    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(pathParams.collection)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should fail when trying to replace a non-existent edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when trying to replace a non-existent edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when trying to replace a non-existent edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const enode = {
      _key: 'does-not-exist',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when trying to replace a non-existent edge`
    }

    expect(() => prepReplace(init.TEST_DATA_COLLECTIONS.edge, enode))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })
})

describe('Commit Helpers - prepRemove', () => {
  before(init.setup)

  after(init.teardown)

  it('should fail when ignoreRevs is false and _rev match fails in vertex node', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in vertex node`
    }

    const node = createSingle({ pathParams, body }, { returnNew: true }).new
    node._rev = 'mismatched_rev'

    expect(() => prepRemove(collName, node, { ignoreRevs: false }))
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should return a meta node after removing a vertex, when ignoreRevs is false, and _rev matches', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should return a meta node after removing a vertex, when ignoreRevs is false, and _rev matches`
    }
    const node = createSingle({ pathParams, body }, { returnNew: true }).new

    const { result, event, time, prevEvent, ssData } = prepRemove(
      collName,
      node,
      { ignoreRevs: false }
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(node._id)
    expect(result._key).to.equal(node._key)
    expect(result._rev).to.equal(node._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new).to.be.empty
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old._rev).to.equal(result._rev)
    expect(result.old.k1).to.equal('v1')

    expect(event).to.equal('deleted')
    expect(typeof time).to.equal('number')

    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode._id).to.equal(prevEvent['last-snapshot'])
    expect(ssData.hopsFromLast).to.equal(
      prevEvent['hops-from-last-snapshot'] + 1
    )
  })

  it('should return a meta node after removing a vertex, when ignoreRevs is true, irrespective of _rev match', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should return a meta node after removing a vertex, when ignoreRevs is true, irrespective of _rev match`
    }

    const node = createSingle({ pathParams, body }, { returnNew: true }).new
    node._rev = 'mismatched_rev'

    const { result, event, time, prevEvent, ssData } = prepRemove(
      collName,
      node
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(node._id)
    expect(result._key).to.equal(node._key)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new).to.be.empty
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old._rev).to.equal(result._rev)
    expect(result.old.k1).to.equal('v1')

    expect(event).to.equal('deleted')
    expect(typeof time).to.equal('number')

    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode._id).to.equal(prevEvent['last-snapshot'])
    expect(ssData.hopsFromLast).to.equal(
      prevEvent['hops-from-last-snapshot'] + 1
    )
  })

  it('should fail when trying to remove a non-existent vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      _key: 'does-not-exist',
      src: `${__filename}:should fail when trying to remove a non-existent vertex`
    }

    expect(() => prepRemove(collName, node))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })

  it('should fail when ignoreRevs is false and _rev match fails in edge node', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in edge node`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in edge node`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in edge node`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode._rev = 'mismatched_rev'

    expect(() =>
      prepRemove(pathParams.collection, ecnode, { ignoreRevs: false })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should return a meta node after removing a edge, when ignoreRevs is false, and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after removing an edge, when ignoreRevs is false, and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after removing an edge, when ignoreRevs is false, and _rev matches`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should return a meta node after removing an edge, when ignoreRevs is false, and _rev matches`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new

    const { result, event, time, prevEvent, ssData } = prepRemove(
      pathParams.collection,
      ecnode,
      { ignoreRevs: false }
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(ecnode._id)
    expect(result._key).to.equal(ecnode._key)
    expect(result._rev).to.equal(ecnode._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new).to.be.empty
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old._rev).to.equal(result._rev)
    expect(result.old._from).to.equal(ecnode._from)
    expect(result.old._to).to.equal(ecnode._to)
    expect(result.old.k1).to.equal('v1')

    expect(event).to.equal('deleted')
    expect(typeof time).to.equal('number')

    const coll = db._collection(pathParams.collection)
    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode._id).to.equal(prevEvent['last-snapshot'])
    expect(ssData.hopsFromLast).to.equal(
      prevEvent['hops-from-last-snapshot'] + 1
    )
  })

  it('should return a meta node after removing an edge, when ignoreRevs is true, irrespective of _rev match', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after removing an edge, when ignoreRevs is true, irrespective of _rev match`
      },
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after removing an edge, when ignoreRevs is true, irrespective of _rev match`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should return a meta node after removing an edge`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode._rev = 'mismatched_rev'

    const { result, event, time, prevEvent, ssData } = prepRemove(
      pathParams.collection,
      ecnode
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(ecnode._id)
    expect(result._key).to.equal(ecnode._key)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new).to.be.empty
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old._rev).to.equal(result._rev)
    expect(result.old._from).to.equal(ecnode._from)
    expect(result.old._to).to.equal(ecnode._to)
    expect(result.old.k1).to.equal('v1')

    expect(event).to.equal('deleted')
    expect(typeof time).to.equal('number')

    const coll = db._collection(pathParams.collection)
    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode._id).to.equal(prevEvent['last-snapshot'])
    expect(ssData.hopsFromLast).to.equal(
      prevEvent['hops-from-last-snapshot'] + 1
    )
  })

  it('should fail when trying to remove a non-existent edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when trying to remove a non-existent edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when trying to remove a non-existent edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const enode = {
      _key: 'does-not-exist',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when trying to remove a non-existent edge`
    }

    expect(() => prepRemove(init.TEST_DATA_COLLECTIONS.edge, enode))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })
})

describe('Commit Helpers - prepUpdate', () => {
  before(init.setup)

  after(init.teardown)

  it('should fail when ignoreRevs is false and _rev match fails in vertex node', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in vertex node`
    }
    const node = createSingle({ pathParams, body }, { returnNew: true }).new

    const unode = pick(node, '_key', 'k1', '_rev')
    unode.k1 = 'v2'
    unode._rev = 'mismatched_rev'

    expect(() => prepUpdate(collName, unode, { ignoreRevs: false }))
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should return a meta node after updating a vertex, when ignoreRevs is false, and _rev matches', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should return a meta node after updating a vertex, when ignoreRevs is false, and _rev matches`
    }
    const node = createSingle({ pathParams, body }, { returnNew: true }).new

    const unode = pick(node, '_key', 'k1', '_rev')
    unode.k1 = 'v2'

    const { result, event, time, prevEvent, ssData } = prepUpdate(
      collName,
      unode,
      { ignoreRevs: false }
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(node._id)
    expect(result._key).to.equal(unode._key)
    expect(result._rev).to.not.equal(unode._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new.k1).to.equal('v2')
    expect(result.new.k2).to.equal('v1')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old._rev).to.equal(node._rev)
    expect(result.old.k1).to.equal('v1')
    expect(result.old.k2).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(collName)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should return a meta node after updating a vertex, when ignoreRevs is true, irrespective of _rev match', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should return a meta node after updating a vertex, when ignoreRevs is true, irrespective of _rev match`
    }
    const node = createSingle({ pathParams, body })

    const unode = pick(node, '_key')
    unode.k1 = 'v2'
    unode._rev = 'mismatched_rev'

    const { result, event, time, prevEvent, ssData } = prepUpdate(
      collName,
      unode
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(node._id)
    expect(result._key).to.equal(unode._key)
    expect(result._rev).to.not.equal(node._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new.k1).to.equal('v2')
    expect(result.new.k2).to.equal('v1')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old.k1).to.equal('v1')
    expect(result.old.k2).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(collName)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should remove null values when keepNull is false', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should remove null values when keepNull is false`
    }
    const node = createSingle({ pathParams, body })

    const unode = pick(node, '_key')
    unode.k1 = null

    const { result, event, time, prevEvent, ssData } = prepUpdate(
      collName,
      unode,
      { keepNull: false }
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(node._id)
    expect(result._key).to.equal(unode._key)
    expect(result._rev).to.not.equal(node._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new).to.not.have.property('k1')
    expect(result.new.k2).to.equal('v1')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old.k1).to.equal('v1')
    expect(result.old.k2).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(collName)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should preserve null values when keepNull is true', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should preserve null values when keepNull is true`
    }
    const node = createSingle({ pathParams, body })

    const unode = pick(node, '_key')
    unode.k1 = null

    const { result, event, time, prevEvent, ssData } = prepUpdate(
      collName,
      unode
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(node._id)
    expect(result._key).to.equal(unode._key)
    expect(result._rev).to.not.equal(node._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new.k1).to.be.null
    expect(result.new.k2).to.equal('v1')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old.k1).to.equal('v1')
    expect(result.old.k2).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(collName)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should replace objects when mergeObjects is false', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: { a: 1 },
      k2: 'v1',
      src: `${__filename}:should replace objects when mergeObjects is false`
    }
    const node = createSingle({ pathParams, body })

    const unode = pick(node, '_key')
    unode.k1 = { b: 1 }

    const { result, event, time, prevEvent, ssData } = prepUpdate(
      collName,
      unode,
      { mergeObjects: false }
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(node._id)
    expect(result._key).to.equal(unode._key)
    expect(result._rev).to.not.equal(node._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new.k1).to.deep.equal({ b: 1 })
    expect(result.new.k2).to.equal('v1')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old.k1).to.deep.equal({ a: 1 })
    expect(result.old.k2).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(collName)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should merge objects when mergeObjects is true', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const coll = db._collection(collName)
    const pathParams = {
      collection: collName
    }
    const body = {
      k1: { a: 1 },
      k2: 'v1',
      src: `${__filename}:should merge objects when mergeObjects is true`
    }
    const node = createSingle({ pathParams, body })

    const unode = pick(node, '_key')
    unode.k1 = { b: 1 }

    const { result, event, time, prevEvent, ssData } = prepUpdate(
      collName,
      unode
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(node._id)
    expect(result._key).to.equal(unode._key)
    expect(result._rev).to.not.equal(node._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new.k1).to.deep.equal({ b: 1, a: 1 })
    expect(result.new.k2).to.equal('v1')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old.k1).to.deep.equal({ a: 1 })
    expect(result.old.k2).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(collName)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should fail when trying to update a non-existent vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      _key: 'does-not-exist',
      src: `${__filename}:should fail when trying to replace a non-existent vertex`
    }

    expect(() => prepUpdate(collName, node))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })

  it('should fail when ignoreRevs is false and _rev match fails in edge node', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in edge node`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in edge node`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should fail when ignoreRevs is false and _rev match fails in edge node`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new

    const eunode = pick(ecnode, '_key', 'k1')
    eunode.k1 = 'v2'
    eunode._rev = 'mismatched_rev'

    expect(() =>
      prepUpdate(pathParams.collection, eunode, { ignoreRevs: false })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should return a meta node after updating a edge, when ignoreRevs is false, and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after updating an edge, when ignoreRevs is false, and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after updating an edge, when ignoreRevs is false, and _rev matches`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should return a meta node after updating an edge, when ignoreRevs is false, and _rev matches`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new

    const eunode = pick(ecnode, '_key', 'k1', '_rev')
    eunode.k1 = 'v2'

    const { result, event, time, prevEvent, ssData } = prepUpdate(
      pathParams.collection,
      eunode,
      { ignoreRevs: false }
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(ecnode._id)
    expect(result._key).to.equal(eunode._key)
    expect(result._rev).to.not.equal(eunode._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new._from).to.equal(ecnode._from)
    expect(result.new._to).to.equal(ecnode._to)
    expect(result.new.k1).to.equal('v2')
    expect(result.new.k2).to.equal('v1')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old._rev).to.equal(eunode._rev)
    expect(result.old._from).to.equal(ecnode._from)
    expect(result.old._to).to.equal(ecnode._to)
    expect(result.old.k1).to.equal('v1')
    expect(result.old.k2).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const coll = db._collection(pathParams.collection)
    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(pathParams.collection)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should return a meta node after updating an edge, when ignoreRevs is true, irrespective of _rev match', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after updating an edge, when ignoreRevs is true, irrespective of _rev match`
      },
      {
        k1: 'v1',
        src: `${__filename}:should return a meta node after updating an edge, when ignoreRevs is true, irrespective of _rev match`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should return a meta node after updating an edge, when ignoreRevs is true, irrespective of _rev match`
    }

    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new

    const eunode = pick(ecnode, '_key', 'k1')
    eunode.k1 = 'v2'
    eunode._rev = 'mismatched_rev'

    const { result, event, time, prevEvent, ssData } = prepUpdate(
      pathParams.collection,
      eunode
    )

    expect(result).to.be.an.instanceOf(Object)
    expect(result._id).to.equal(ecnode._id)
    expect(result._key).to.equal(eunode._key)
    expect(result._rev).to.not.equal(ecnode._rev)
    expect(result.new).to.be.an.instanceOf(Object)
    expect(result.new._id).to.equal(result._id)
    expect(result.new._key).to.equal(result._key)
    expect(result.new._rev).to.equal(result._rev)
    expect(result.new._from).to.equal(ecnode._from)
    expect(result.new._to).to.equal(ecnode._to)
    expect(result.new.k1).to.equal('v2')
    expect(result.new.k2).to.equal('v1')
    expect(result.old).to.be.an.instanceOf(Object)
    expect(result.old._id).to.equal(result._id)
    expect(result.old._key).to.equal(result._key)
    expect(result.old._from).to.equal(ecnode._from)
    expect(result.old._to).to.equal(ecnode._to)
    expect(result.old.k1).to.equal('v1')
    expect(result.old.k2).to.equal('v1')

    expect(event).to.equal('updated')
    expect(typeof time).to.equal('number')

    const coll = db._collection(pathParams.collection)
    const lastEvent = getLatestEvent(result, coll)
    expect(prevEvent).to.deep.equal(lastEvent)

    expect(ssData).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.be.an.instanceOf(Object)
    expect(ssData.ssNode).to.have.property('_id')
    expect(ssData.ssNode).to.have.property('_key')
    expect(ssData.ssNode).to.have.property('_rev')
    expect(ssData.ssNode.ctime).to.equal(time)
    expect(ssData.ssNode.data).to.deep.equal(result.new)
    expect(ssData.hopsFromLast).to.equal(1)

    const ssInterval = snapshotInterval(pathParams.collection)
    expect(ssData.hopsTillNext).to.equal(ssInterval + 2 - ssData.hopsFromLast)
  })

  it('should fail when trying to update a non-existent edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when trying to update a non-existent edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when trying to update a non-existent edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const enode = {
      _key: 'does-not-exist',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when trying to update a non-existent edge`
    }

    expect(() => prepUpdate(init.TEST_DATA_COLLECTIONS.edge, enode))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })
})

describe('Commit Helpers - metaize', () => {
  before(init.setup)

  after(init.teardown)

  it('should remove leading underscores from the keys of the input object', () => {
    const input = {
      _abc: 1,
      def: 'a',
      d_e_f: {
        _a: 1,
        _a_b: 2,
        ab: 3,
        a_b: 4
      },
      _a_b_c: ['_a', '_a_b', 'ab', 'a_b']
    }
    const output = metaize(input)
    const expectedOutput = mapValues({
      abc: '_abc',
      def: 'def',
      d_e_f: 'd_e_f',
      a_b_c: '_a_b_c'
    }, v => input[v])

    expect(output).to.deep.equal(expectedOutput)
  })
})
