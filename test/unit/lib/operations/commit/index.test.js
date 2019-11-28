/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/init')
const { DB_OPS } = require('../../../../../lib/helpers')
const commit = require('../../../../../lib/operations/commit')
const {
  createMultiple
} = require('../../../../../lib/handlers/createHandlers')

const { errors: ARANGO_ERRORS } = require('@arangodb')

const { pick } = require('lodash')

describe('Commit', () => {
  before(init.setup)

  after(init.teardown)

  it('should create a vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should create a vertex`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT, {
      returnNew: true,
      returnOld: true
    })

    expect(cnode).to.be.an.instanceOf(Object)
    expect(cnode).to.have.property('_id')
    expect(cnode).to.have.property('_key')
    expect(cnode).to.have.property('_rev')
    expect(cnode).to.have.property('new')
    expect(cnode.new).to.be.an.instanceOf(Object)
    expect(cnode.new._id).to.equal(cnode._id)
    expect(cnode.new._key).to.equal(cnode._key)
    expect(cnode.new._rev).to.equal(cnode._rev)
    expect(cnode.new.k1).to.equal('v1')
    expect(cnode).to.have.property('old')
    expect(cnode.old).to.be.an.instanceOf(Object)
    expect(cnode.old).to.be.empty
  })

  it('should fail when creating a vertex with an existing key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should fail when creating a vertex with an existing key`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT)

    expect(() => commit(collName, cnode, DB_OPS.INSERT))
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code)
  })

  it('should fail when creating a vertex with the same key as a deleted vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should fail when creating a vertex with the same key as a deleted vertex`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT)
    commit(collName, cnode, DB_OPS.REMOVE)

    expect(() => commit(collName, cnode, DB_OPS.INSERT)).to.throw(
      `Event log found for node with _id: ${cnode._id}`
    )
  })

  it('should create an edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should create an edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should create an edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should create an edge`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    const cnode = commit(collName, node, DB_OPS.INSERT, {
      returnNew: true,
      returnOld: true
    })

    expect(cnode).to.be.an.instanceOf(Object)
    expect(cnode).to.have.property('_id')
    expect(cnode).to.have.property('_key')
    expect(cnode).to.have.property('_rev')
    expect(cnode.new).to.be.an.instanceOf(Object)
    expect(cnode.new._id).to.equal(cnode._id)
    expect(cnode.new._key).to.equal(cnode._key)
    expect(cnode.new._rev).to.equal(cnode._rev)
    expect(cnode.new._from).to.equal(vnodes[0]._id)
    expect(cnode.new._to).to.equal(vnodes[1]._id)
    expect(cnode.new.k1).to.equal('v1')
    expect(cnode.old).to.be.an.instanceOf(Object)
    expect(cnode.old).to.be.empty
  })

  it('should fail when creating an edge with an existing key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating an edge with an existing key`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating an edge with an existing key`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when creating an edge with an existing key`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new

    expect(() => commit(collName, cnode, DB_OPS.INSERT))
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code)
  })

  it('should fail when creating an edge with the same key as a deleted edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating an edge with the same key as a deleted edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating an edge with the same key as a deleted edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when creating an edge with the same key as a deleted edge`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new
    commit(collName, cnode, DB_OPS.REMOVE)

    expect(() => commit(collName, cnode, DB_OPS.INSERT)).to.throw(
      `Event log found for node with _id: ${cnode._id}`
    )
  })

  it('should fail when replacing a vertex where ignoreRevs is false and _rev match fails', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should fail when replacing a vertex where ignoreRevs is false and _rev match fails`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new
    cnode.k1 = 'v2'
    cnode._rev = 'mismatched_rev'

    expect(() =>
      commit(collName, cnode, DB_OPS.REPLACE, {}, { ignoreRevs: false })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should replace a vertex where ignoreRevs is false and _rev matches', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should replace a vertex where ignoreRevs is false and _rev matches`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new
    cnode.k1 = 'v2'

    const rnode = commit(
      collName,
      cnode,
      DB_OPS.REPLACE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: false }
    )

    expect(rnode).to.be.an.instanceOf(Object)
    expect(rnode._id).to.equal(cnode._id)
    expect(rnode._key).to.equal(cnode._key)
    expect(rnode._rev).to.not.equal(cnode._rev)
    expect(rnode.new).to.be.an.instanceOf(Object)
    expect(rnode.new._id).to.equal(rnode._id)
    expect(rnode.new._key).to.equal(rnode._key)
    expect(rnode.new._rev).to.equal(rnode._rev)
    expect(rnode.new.k1).to.equal('v2')
    expect(rnode.old).to.be.an.instanceOf(Object)
    expect(rnode.old._id).to.equal(rnode._id)
    expect(rnode.old._key).to.equal(rnode._key)
    expect(rnode.old._rev).to.equal(cnode._rev)
    expect(rnode.old.k1).to.equal('v1')
  })

  it('should replace a vertex where ignoreRevs is true, irrespective of _rev', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should replace a vertex where ignoreRevs is true, irrespective of _rev`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT)
    cnode.k1 = 'v2'
    cnode._rev = 'mismatched_rev'

    const rnode = commit(
      collName,
      cnode,
      DB_OPS.REPLACE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: true }
    )

    expect(rnode).to.be.an.instanceOf(Object)
    expect(rnode._id).to.equal(cnode._id)
    expect(rnode._key).to.equal(cnode._key)
    expect(rnode._rev).to.not.equal(cnode._rev)
    expect(rnode.new).to.be.an.instanceOf(Object)
    expect(rnode.new._id).to.equal(rnode._id)
    expect(rnode.new._key).to.equal(rnode._key)
    expect(rnode.new._rev).to.equal(rnode._rev)
    expect(rnode.new.k1).to.equal('v2')
    expect(rnode.old).to.be.an.instanceOf(Object)
    expect(rnode.old._id).to.equal(rnode._id)
    expect(rnode.old._key).to.equal(rnode._key)
    expect(rnode.old.k1).to.equal('v1')
  })

  it('should fail when replacing a vertex with a non-existent key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail when replacing a vertex with a non-existent key`
    }

    expect(() => commit(collName, node, DB_OPS.REPLACE))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })

  it('should fail when replacing an edge where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing an edge where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing an edge where ignoreRevs is false and _rev match fails`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when replacing an edge where ignoreRevs is false and _rev match fails`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new
    cnode.k1 = 'v2'
    cnode._rev = 'mismatched_rev'

    expect(() =>
      commit(collName, cnode, DB_OPS.REPLACE, {}, { ignoreRevs: false })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should replace an edge where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should replace an edge where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace an edge where ignoreRevs is false and _rev matches`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should replace an edge where ignoreRevs is false and _rev matches`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new
    cnode.k1 = 'v2'

    const rnode = commit(
      collName,
      cnode,
      DB_OPS.REPLACE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: false }
    )

    expect(rnode).to.be.an.instanceOf(Object)
    expect(rnode._id).to.equal(cnode._id)
    expect(rnode._key).to.equal(cnode._key)
    expect(rnode._rev).to.not.equal(cnode._rev)
    expect(rnode.new).to.be.an.instanceOf(Object)
    expect(rnode.new._id).to.equal(rnode._id)
    expect(rnode.new._key).to.equal(rnode._key)
    expect(rnode.new._rev).to.equal(rnode._rev)
    expect(rnode.new.k1).to.equal('v2')
    expect(rnode.old).to.be.an.instanceOf(Object)
    expect(rnode.old._id).to.equal(rnode._id)
    expect(rnode.old._key).to.equal(rnode._key)
    expect(rnode.old._rev).to.equal(cnode._rev)
    expect(rnode.old.k1).to.equal('v1')
  })

  it('should replace an edge node where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should replace an edge node where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace an edge node where ignoreRevs is true, irrespective of _rev`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should replace an edge node where ignoreRevs is true, irrespective of _rev`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new
    cnode.k1 = 'v2'

    const rnode = commit(
      collName,
      cnode,
      DB_OPS.REPLACE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: true }
    )

    expect(rnode).to.be.an.instanceOf(Object)
    expect(rnode._id).to.equal(cnode._id)
    expect(rnode._key).to.equal(cnode._key)
    expect(rnode._rev).to.not.equal(cnode._rev)
    expect(rnode.new).to.be.an.instanceOf(Object)
    expect(rnode.new._id).to.equal(rnode._id)
    expect(rnode.new._key).to.equal(rnode._key)
    expect(rnode.new._rev).to.equal(rnode._rev)
    expect(rnode.new._from).to.equal(vnodes[0]._id)
    expect(rnode.new._to).to.equal(vnodes[1]._id)
    expect(rnode.new.k1).to.equal('v2')
    expect(rnode.old).to.be.an.instanceOf(Object)
    expect(rnode.old._id).to.equal(rnode._id)
    expect(rnode.old._key).to.equal(rnode._key)
    expect(rnode.old._rev).to.equal(cnode._rev)
    expect(rnode.old._from).to.equal(rnode.new._from)
    expect(rnode.old._to).to.equal(rnode.new._to)
    expect(rnode.old.k1).to.equal('v1')
  })

  it('should fail when replacing an edge with a non-existent key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing an edge with a non-existent key`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing an edge with a non-existent key`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail when replacing an edge with a non-existent key`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    expect(() => commit(collName, node, DB_OPS.REPLACE))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })

  it('should fail when deleting a vertex where ignoreRevs is false and _rev match fails', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should fail when deleting a vertex where ignoreRevs is false and _rev match fails`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT)
    cnode._rev = 'mismatched_rev'

    expect(() =>
      commit(collName, cnode, DB_OPS.REMOVE, {}, { ignoreRevs: false })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should delete a vertex where ignoreRevs is false and _rev matches', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should delete a vertex where ignoreRevs is false and _rev matches`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new

    const dnode = commit(
      collName,
      cnode,
      DB_OPS.REMOVE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: false }
    )

    expect(dnode).to.be.an.instanceOf(Object)
    expect(dnode._id).to.equal(cnode._id)
    expect(dnode._key).to.equal(cnode._key)
    expect(dnode._rev).to.equal(cnode._rev)
    expect(dnode.old).to.deep.equal(cnode)
    expect(dnode.new).to.be.an.instanceOf(Object)
    expect(dnode.new).to.be.empty
  })

  it('should delete a vertex where ignoreRevs is true, irrespective of _rev', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should delete a vertex where ignoreRevs is true, irrespective of _rev`
    }
    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new

    const dnode = commit(collName, cnode, DB_OPS.REMOVE, {
      returnNew: true,
      returnOld: true
    })

    expect(dnode).to.be.an.instanceOf(Object)
    expect(dnode._id).to.equal(cnode._id)
    expect(dnode._key).to.equal(cnode._key)
    expect(dnode._rev).to.equal(cnode._rev)
    expect(dnode.old).to.deep.equal(cnode)
    expect(dnode.new).to.be.an.instanceOf(Object)
    expect(dnode.new).to.be.empty
  })

  it('should fail when deleting a vertex with a non-existent key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail when deleting a vertex with a non-existent key`
    }

    expect(() => commit(collName, node, DB_OPS.REMOVE))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })

  it('should fail when deleting an edge where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when deleting an edge where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when deleting an edge where ignoreRevs is false and _rev match fails`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when deleting an edge where ignoreRevs is false and _rev match fails`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new
    cnode._rev = 'mismatched_rev'

    expect(() =>
      commit(collName, cnode, DB_OPS.REMOVE, {}, { ignoreRevs: false })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should delete an edge where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should delete an edge where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should delete an edge where ignoreRevs is false and _rev matches`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should delete an edge where ignoreRevs is false and _rev matches`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new

    const dnode = commit(
      collName,
      cnode,
      DB_OPS.REMOVE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: false }
    )

    expect(dnode).to.be.an.instanceOf(Object)
    expect(dnode._id).to.equal(cnode._id)
    expect(dnode._key).to.equal(cnode._key)
    expect(dnode._rev).to.equal(cnode._rev)
    expect(dnode.old).to.deep.equal(cnode)
    expect(dnode.new).to.be.an.instanceOf(Object)
    expect(dnode.new).to.be.empty
  })

  it('should delete an edge node where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should delete an edge node where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should delete an edge node where ignoreRevs is true, irrespective of _rev`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should delete an edge node where ignoreRevs is true, irrespective of _rev`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new

    const dnode = commit(
      collName,
      cnode,
      DB_OPS.REMOVE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: true }
    )

    expect(dnode).to.be.an.instanceOf(Object)
    expect(dnode._id).to.equal(cnode._id)
    expect(dnode._key).to.equal(cnode._key)
    expect(dnode._rev).to.equal(cnode._rev)
    expect(dnode.old).to.deep.equal(cnode)
    expect(dnode.new).to.be.an.instanceOf(Object)
    expect(dnode.new).to.be.empty
  })

  it('should fail when deleting an edge with a non-existent key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when deleting an edge with a non-existent key`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when deleting an edge with a non-existent key`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail when deleting an edge with a non-existent key`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    expect(() => commit(collName, node, DB_OPS.REPLACE))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })

  it('should fail when updating a vertex where ignoreRevs is false and _rev match fails', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should fail when updating a vertex where ignoreRevs is false and _rev match fails`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true })
      .new

    const unode = pick(cnode, '_key', 'k1')
    unode.k1 = 'v2'
    unode._rev = 'mismatched_rev'

    expect(() =>
      commit(collName, unode, DB_OPS.UPDATE, {}, { ignoreRevs: false })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should update a vertex where ignoreRevs is false and _rev matches', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should replace a vertex where ignoreRevs is false and _rev matches`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key', '_rev')
    unode.k1 = 'v2'

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: false }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new.k1).to.equal('v2')
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old.k1).to.equal('v1')
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should update a vertex where ignoreRevs is true, irrespective of _rev', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should update a vertex where ignoreRevs is true, irrespective of _rev`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key')
    unode.k1 = 'v2'
    unode._rev = 'mismatched_rev'

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: true }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new.k1).to.equal('v2')
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old.k1).to.equal('v1')
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should remove null values from a vertex when keepNull is false', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should remove null values from a vertex when keepNull is false`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key')
    unode.k1 = null
    unode._rev = 'mismatched_rev'

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { keepNull: false }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new).to.not.have.property('k1')
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old.k1).to.equal('v1')
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should preserve null values in a vertex when keepNull is true', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should preserve null values in a vertex when keepNull is true`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key')
    unode.k1 = null
    unode._rev = 'mismatched_rev'

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { keepNull: true }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new.k1).to.be.null
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old.k1).to.equal('v1')
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should replace objects in a vertex when mergeObjects is false', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: { a: 1 },
      k2: 'v1',
      src: `${__filename}:should replace objects in a vertex when mergeObjects is false`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key')
    unode.k1 = { b: 1 }

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { mergeObjects: false }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new.k1).to.deep.equal({ b: 1 })
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old.k1).to.deep.equal({ a: 1 })
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should merge objects in a vertex when mergeObjects is true', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: { a: 1 },
      k2: 'v1',
      src: `${__filename}:should merge objects in a vertex when mergeObjects is true`
    }

    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key')
    unode.k1 = { b: 1 }

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { mergeObjects: true }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new.k1).to.deep.equal({ b: 1, a: 1 })
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old.k1).to.deep.equal({ a: 1 })
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should fail when updating a vertex with a non-existent key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail when updating a vertex with a non-existent key`
    }

    expect(() => commit(collName, node, DB_OPS.UPDATE))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })

  it('should fail when updating an edge where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when updating an edge where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when updating an edge where ignoreRevs is false and _rev match fails`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should fail when updating an edge where ignoreRevs is false and _rev match fails`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge
    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key')
    unode.k1 = 'v2'
    unode._rev = 'mismatched_rev'

    expect(() =>
      commit(collName, unode, DB_OPS.UPDATE, {}, { ignoreRevs: false })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should update an edge where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should update an edge where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should update an edge where ignoreRevs is false and _rev matches`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should update an edge where ignoreRevs is false and _rev matches`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge
    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key', '_rev')
    unode.k1 = 'v2'

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: false }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new._from).to.equal(vnodes[0]._id)
    expect(uunode.new._to).to.equal(vnodes[1]._id)
    expect(uunode.new.k1).to.equal('v2')
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old._rev).to.equal(cnode._rev)
    expect(uunode.old._from).to.equal(uunode.new._from)
    expect(uunode.old._to).to.equal(uunode.new._to)
    expect(uunode.old.k1).to.equal('v1')
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should update an edge node where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should update an edge node where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should update an edge node where ignoreRevs is true, irrespective of _rev`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should update an edge node where ignoreRevs is true, irrespective of _rev`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge
    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key', '_rev')
    unode.k1 = 'v2'

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { ignoreRevs: true }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new._from).to.equal(vnodes[0]._id)
    expect(uunode.new._to).to.equal(vnodes[1]._id)
    expect(uunode.new.k1).to.equal('v2')
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old._rev).to.equal(cnode._rev)
    expect(uunode.old._from).to.equal(uunode.new._from)
    expect(uunode.old._to).to.equal(uunode.new._to)
    expect(uunode.old.k1).to.equal('v1')
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should remove null values from an edge when keepNull is false', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should remove null values from an edge when keepNull is false`
      },
      {
        k1: 'v1',
        src: `${__filename}:should remove null values from an edge when keepNull is false`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should remove null values from an edge when keepNull is false`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge
    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key', '_rev')
    unode.k1 = null

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { keepNull: false }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new._from).to.equal(vnodes[0]._id)
    expect(uunode.new._to).to.equal(vnodes[1]._id)
    expect(uunode.new).to.not.have.property('k1')
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old._rev).to.equal(cnode._rev)
    expect(uunode.old._from).to.equal(uunode.new._from)
    expect(uunode.old._to).to.equal(uunode.new._to)
    expect(uunode.old.k1).to.equal('v1')
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should preserve null values in an edge when keepNull is true', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should preserve null values in an edge when keepNull is true`
      },
      {
        k1: 'v1',
        src: `${__filename}:should preserve null values in an edge when keepNull is true`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should preserve null values in an edge when keepNull is true`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge
    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key', '_rev')
    unode.k1 = null

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { keepNull: true }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new._from).to.equal(vnodes[0]._id)
    expect(uunode.new._to).to.equal(vnodes[1]._id)
    expect(uunode.new.k1).to.be.null
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old._rev).to.equal(cnode._rev)
    expect(uunode.old._from).to.equal(uunode.new._from)
    expect(uunode.old._to).to.equal(uunode.new._to)
    expect(uunode.old.k1).to.equal('v1')
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should replace objects in an edge when mergeObjects is false', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should replace objects in an edge when mergeObjects is false`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace objects in an edge when mergeObjects is false`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: { a: 1 },
      k2: 'v1',
      src: `${__filename}:should replace objects in an edge when mergeObjects is false`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge
    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key', '_rev')
    unode.k1 = { b: 1 }

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { mergeObjects: false }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new._from).to.equal(vnodes[0]._id)
    expect(uunode.new._to).to.equal(vnodes[1]._id)
    expect(uunode.new.k1).to.deep.equal({ b: 1 })
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old._rev).to.equal(cnode._rev)
    expect(uunode.old._from).to.equal(uunode.new._from)
    expect(uunode.old._to).to.equal(uunode.new._to)
    expect(uunode.old.k1).to.deep.equal({ a: 1 })
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should merge objects in an edge when mergeObjects is true', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should merge objects in an edge when mergeObjects is true`
      },
      {
        k1: 'v1',
        src: `${__filename}:should merge objects in an edge when mergeObjects is true`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: { a: 1 },
      k2: 'v1',
      src: `${__filename}:should merge objects in an edge when mergeObjects is true`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge
    const cnode = commit(collName, node, DB_OPS.INSERT)

    const unode = pick(cnode, '_key', '_rev')
    unode.k1 = { b: 1 }

    const uunode = commit(
      collName,
      unode,
      DB_OPS.UPDATE,
      { returnNew: true, returnOld: true },
      { mergeObjects: true }
    )

    expect(uunode).to.be.an.instanceOf(Object)
    expect(uunode._id).to.equal(cnode._id)
    expect(uunode._key).to.equal(cnode._key)
    expect(uunode._rev).to.not.equal(cnode._rev)
    expect(uunode.new).to.be.an.instanceOf(Object)
    expect(uunode.new._id).to.equal(uunode._id)
    expect(uunode.new._key).to.equal(uunode._key)
    expect(uunode.new._rev).to.equal(uunode._rev)
    expect(uunode.new._from).to.equal(vnodes[0]._id)
    expect(uunode.new._to).to.equal(vnodes[1]._id)
    expect(uunode.new.k1).to.deep.equal({ b: 1, a: 1 })
    expect(uunode.new.k2).to.equal('v1')
    expect(uunode.old).to.be.an.instanceOf(Object)
    expect(uunode.old._id).to.equal(uunode._id)
    expect(uunode.old._key).to.equal(uunode._key)
    expect(uunode.old._rev).to.equal(cnode._rev)
    expect(uunode.old._from).to.equal(uunode.new._from)
    expect(uunode.old._to).to.equal(uunode.new._to)
    expect(uunode.old.k1).to.deep.equal({ a: 1 })
    expect(uunode.old.k2).to.equal('v1')
  })

  it('should fail when updating an edge with a non-existent key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when updating an edge with a non-existent key`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when updating an edge with a non-existent key`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      k2: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail when updating an edge with a non-existent key`
    }
    const collName = init.TEST_DATA_COLLECTIONS.edge

    expect(() => commit(collName, node, DB_OPS.UPDATE))
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })
})
