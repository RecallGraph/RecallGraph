/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../helpers/init')
const {
  createSingle,
  createMultiple
} = require('../../../../lib/handlers/createHandlers')
const {
  removeSingle,
  removeMultiple
} = require('../../../../lib/handlers/removeHandlers')
const { errors: ARANGO_ERRORS } = require('@arangodb')

describe('Create Handlers', () => {
  before(init.setup)

  after(init.teardown)

  it('should create a single vertex', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should create a single vertex`
    }

    const node = createSingle(
      { pathParams, body },
      { returnNew: true, returnOld: true }
    )

    expect(node).to.be.an.instanceOf(Object)
    expect(node).to.have.property('_id')
    expect(node).to.have.property('_key')
    expect(node).to.have.property('_rev')
    expect(node.new).to.be.an.instanceOf(Object)
    expect(node.new._id).to.equal(node._id)
    expect(node.new._key).to.equal(node._key)
    expect(node.new._rev).to.equal(node._rev)
    expect(node.new.k1).to.equal('v1')
    expect(node.old).to.be.an.instanceOf(Object)
    // noinspection BadExpressionStatementJS
    expect(node.old).to.be.empty
  })

  it('should create two vertices', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should create two vertices`
      },
      {
        k1: 'v1',
        src: `${__filename}:should create two vertices`
      }
    ]

    const nodes = createMultiple(
      { pathParams, body },
      { returnNew: true, returnOld: true }
    )

    expect(nodes).to.be.an.instanceOf(Array)
    expect(nodes).to.have.lengthOf(2)
    nodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node).to.have.property('_id')
      expect(node).to.have.property('_key')
      expect(node).to.have.property('_rev')
      expect(node.new).to.be.an.instanceOf(Object)
      expect(node.new._id).to.equal(node._id)
      expect(node.new._key).to.equal(node._key)
      expect(node.new._rev).to.equal(node._rev)
      expect(node.new.k1).to.equal('v1')
      expect(node.old).to.be.an.instanceOf(Object)
      // noinspection BadExpressionStatementJS
      expect(node.old).to.be.empty
    })
  })

  it('should create a single edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should create a single edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should create a single edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should create a single edge`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const enode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true, returnOld: true }
    )

    expect(enode).to.be.an.instanceOf(Object)
    expect(enode).to.have.property('_id')
    expect(enode).to.have.property('_key')
    expect(enode).to.have.property('_rev')
    expect(enode.new).to.be.an.instanceOf(Object)
    expect(enode.new._id).to.equal(enode._id)
    expect(enode.new._key).to.equal(enode._key)
    expect(enode.new._rev).to.equal(enode._rev)
    expect(enode.new._from).to.equal(vnodes[0]._id)
    expect(enode.new._to).to.equal(vnodes[1]._id)
    expect(enode.new.k1).to.equal('v1')
    expect(enode.old).to.be.an.instanceOf(Object)
    // noinspection BadExpressionStatementJS
    expect(enode.old).to.be.empty
  })

  it('should create two edges', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should create two edges`
      },
      {
        k1: 'v1',
        src: `${__filename}:should create two edges`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should create two edges`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should create two edges`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const enodes = createMultiple(
      { pathParams, body: ebody },
      { returnNew: true, returnOld: true }
    )

    expect(enodes).to.be.an.instanceOf(Array)
    expect(enodes).to.have.lengthOf(2)
    enodes.forEach(enode => {
      expect(enode).to.be.an.instanceOf(Object)
      expect(enode).to.have.property('_id')
      expect(enode).to.have.property('_key')
      expect(enode).to.have.property('_rev')
      expect(enode.new).to.be.an.instanceOf(Object)
      expect(enode.new._id).to.equal(enode._id)
      expect(enode.new._key).to.equal(enode._key)
      expect(enode.new._rev).to.equal(enode._rev)
      expect(enode.new._from).to.equal(vnodes[0]._id)
      expect(enode.new._to).to.equal(vnodes[1]._id)
      expect(enode.new.k1).to.equal('v1')
      expect(enode.old).to.be.an.instanceOf(Object)
      // noinspection BadExpressionStatementJS
      expect(enode.old).to.be.empty
    })
  })

  it('should fail when creating a vertex with existing key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should fail when creating a vertex with existing key`
    }

    const node = createSingle({ pathParams, body })

    expect(() =>
      createSingle({
        pathParams,
        body: node
      })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code)
  })

  it('should fail when creating a vertex with the same key as a deleted vertex', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should fail when creating a vertex with the same key as a deleted vertex`
    }

    const node = createSingle({ pathParams, body })
    removeSingle({ pathParams, body: node })

    expect(() =>
      createSingle({
        pathParams,
        body: node
      })
    ).to.throw(`Event log found for node with _id: ${node._id}`)
  })

  it('should fail when creating two vertices with existing key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating two vertices with existing key`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating two vertices with existing key`
      }
    ]

    let nodes = createMultiple({ pathParams, body })
    nodes = createMultiple({ pathParams, body: nodes })

    expect(nodes).to.be.an.instanceOf(Array)
    nodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      )
      // noinspection BadExpressionStatementJS
      expect(node.errorMessage).to.include(
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.message
      )
    })
  })

  it('should fail when creating two vertices with the same keys as deleted vertices', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating two vertices with the same keys as deleted vertices`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating two vertices with the same keys as deleted vertices`
      }
    ]

    const nodes = createMultiple({ pathParams, body })
    removeMultiple({ pathParams, body: nodes })
    const cnodes = createMultiple({ pathParams, body: nodes })

    expect(cnodes).to.be.an.instanceOf(Array)
    cnodes.forEach((node, idx) => {
      expect(node).to.be.an.instanceOf(Error)
      expect(node.message).to.include(
        `Event log found for node with _id: ${nodes[idx]._id}`
      )
    })
  })

  it('should fail when creating an edge with existing key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating an edge with existing key`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating an edge with existing key`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when creating an edge with existing key`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const enode = createSingle({ pathParams, body: ebody }, { returnNew: true })
      .new

    expect(() =>
      createSingle({
        pathParams,
        body: enode
      })
    )
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

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when creating an edge with the same key as a deleted edge`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const enode = createSingle({ pathParams, body: ebody }, { returnNew: true })
      .new
    removeSingle({ pathParams, body: enode })

    expect(() =>
      createSingle({
        pathParams,
        body: enode
      })
    ).to.throw(`Event log found for node with _id: ${enode._id}`)
  })

  it('should fail when creating two edges with existing key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating two edges with existing key`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating two edges with existing key`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should fail when creating two edges with existing key`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should fail when creating two edges with existing key`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    let enodes = createMultiple(
      { pathParams, body: ebody },
      { returnNew: true }
    )
    enodes = createMultiple({ pathParams, body: enodes.map(node => node.new) })

    expect(enodes).to.be.an.instanceOf(Array)
    enodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      )
      // noinspection BadExpressionStatementJS
      expect(node.errorMessage).to.include(
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.message
      )
    })
  })

  it('should fail when creating two edges with the same keys as deleted vertices', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating two edges with the same keys as deleted vertices`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when creating two edges with the same keys as deleted vertices`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should fail when creating two edges with the same keys as deleted vertices`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should fail when creating two edges with the same keys as deleted vertices`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const enodes = createMultiple(
      { pathParams, body: ebody },
      { returnNew: true }
    )
    removeMultiple({ pathParams, body: enodes })
    const ecnodes = createMultiple({
      pathParams,
      body: enodes.map(node => node.new)
    })

    expect(ecnodes).to.be.an.instanceOf(Array)
    ecnodes.forEach((node, idx) => {
      expect(node).to.be.an.instanceOf(Error)
      expect(node.message).to.include(
        `Event log found for node with _id: ${enodes[idx]._id}`
      )
    })
  })
})
