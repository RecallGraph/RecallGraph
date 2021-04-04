'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/util/init')

const request = require('@arangodb/request')
const { baseUrl } = module.context

const { errors: ARANGO_ERRORS } = require('@arangodb')

describe('Routes - create', () => {
  before(init.setup)

  after(init.teardown)

  it('should create a single vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const node = {
      k1: 'v1',
      src: `${__filename}:should create a single vertex`
    }

    const response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(201)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody).to.have.property('_id')
    expect(resBody).to.have.property('_key')
    expect(resBody).to.have.property('_rev')
    expect(resBody.k1).to.equal('v1')
  })

  it('should create two vertices', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    const nodes = [
      {
        k1: 'v1',
        src: `${__filename}:should create two vertices`
      },
      {
        k1: 'v1',
        src: `${__filename}:should create two vertices`
      }
    ]

    const response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes,
      qs: {
        returnNew: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(201)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach(resNode => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode).to.have.property('_id')
        expect(resNode).to.have.property('_key')
        expect(resNode).to.have.property('_rev')
        expect(resNode.k1).to.equal('v1')
      })
  })

  it('should create a single edge', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should create a single edge`
      },
      {
        src: `${__filename}:should create a single edge`
      }
    ]
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    })
    vnodes = JSON.parse(vResponse.body)

    const eCollName = init.TEST_DATA_COLLECTIONS.edge
    const enode = {
      k1: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      src: `${__filename}:should create a single edge`
    }

    const response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(201)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody).to.have.property('_id')
    expect(resBody).to.have.property('_key')
    expect(resBody).to.have.property('_rev')
    expect(resBody.k1).to.equal('v1')
    expect(resBody._from).to.equal(vnodes[0]._id)
    expect(resBody._to).to.equal(vnodes[1]._id)
  })

  it('should create two edges', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should create two edges`
      },
      {
        src: `${__filename}:should create two edges`
      }
    ]
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    })
    vnodes = JSON.parse(vResponse.body)

    const eCollName = init.TEST_DATA_COLLECTIONS.edge
    const enodes = [
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should create two edges`
      },
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should create two edges`
      }
    ]

    const response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes,
      qs: {
        returnNew: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(201)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach(resNode => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode).to.have.property('_id')
        expect(resNode).to.have.property('_key')
        expect(resNode).to.have.property('_rev')
        expect(resNode.k1).to.equal('v1')
        expect(resNode._from).to.equal(vnodes[0]._id)
        expect(resNode._to).to.equal(vnodes[1]._id)
      })
  })

  it('should fail to create a single vertex with duplicate key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      src: `${__filename}:should fail to create a single vertex with duplicate key`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    node = JSON.parse(response.body)
    response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code}:1`
    )
  })

  it('should fail to create a single vertex with the same key as a deleted vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      src: `${__filename}:should fail to create a single vertex with the same key as a deleted vertex`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    node = JSON.parse(response.body)
    request.delete(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })
    response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code}:1`
    )
  })

  it('should fail to create two vertices with duplicate keys', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        src: `${__filename}:should fail to create two vertices with duplicate keys`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail to create two vertices with duplicate keys`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    nodes = JSON.parse(response.body)
    response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code}:2`
    )

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody.forEach(resNode => {
      expect(resNode).to.be.an.instanceOf(Object)
      expect(resNode.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      )
      expect(resNode.errorMessage).to.include(
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.message
      )
    })
  })

  it('should fail to create two vertices with the same keys as deleted vertices', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        src: `${__filename}:should fail to create two vertices with the same keys as deleted vertices`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail to create two vertices with the same keys as deleted vertices`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    nodes = JSON.parse(response.body)
    request.delete(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })
    response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code}:2`
    )

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody.forEach((resNode, idx) => {
      expect(resNode).to.be.an.instanceOf(Object)
      expect(resNode.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      )
      expect(resNode.errorMessage).to.include(
        `Event log found for node with _id: ${nodes[idx]._id}`
      )
    })
  })

  it('should fail to create a single edge with duplicate key', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail to create a single edge with duplicate key`
      },
      {
        src: `${__filename}:should fail to create a single edge with duplicate key`
      }
    ]
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    })
    vnodes = JSON.parse(vResponse.body)

    const eCollName = init.TEST_DATA_COLLECTIONS.edge
    let enode = {
      k1: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      src: `${__filename}:should fail to create a single edge with duplicate key`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true
      }
    })

    enode = JSON.parse(response.body).new
    response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code}:1`
    )
  })

  it('should fail to create a single edge with the same key as a deleted edge', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail to create a single edge with the same key as a deleted edge`
      },
      {
        src: `${__filename}:should fail to create a single edge with the same key as a deleted edge`
      }
    ]
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    })
    vnodes = JSON.parse(vResponse.body)

    const eCollName = init.TEST_DATA_COLLECTIONS.edge
    let enode = {
      k1: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      src: `${__filename}:should fail to create a single edge with the same key as a deleted edge`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true
      }
    })

    enode = JSON.parse(response.body).new
    request.delete(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })
    response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code}:1`
    )
  })

  it('should fail to create two edges with duplicate keys', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail to create two edges with duplicate keys`
      },
      {
        src: `${__filename}:should fail to create two edges with duplicate keys`
      }
    ]
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    })
    vnodes = JSON.parse(vResponse.body)

    const eCollName = init.TEST_DATA_COLLECTIONS.edge
    let enodes = [
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should fail to create two edges with duplicate keys`
      },
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should fail to create two edges with duplicate keys`
      }
    ]

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes,
      qs: {
        returnNew: true
      }
    })

    enodes = JSON.parse(response.body)
    response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(enode => enode.new)
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code}:2`
    )

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody.forEach(resNode => {
      expect(resNode).to.be.an.instanceOf(Object)
      expect(resNode.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      )
      expect(resNode.errorMessage).to.include(
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.message
      )
    })
  })

  it('should fail to create two edges with the same keys as deleted edges', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail to create two edges with the same keys as deleted edges`
      },
      {
        src: `${__filename}:should fail to create two edges with the same keys as deleted edges`
      }
    ]
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    })
    vnodes = JSON.parse(vResponse.body)

    const eCollName = init.TEST_DATA_COLLECTIONS.edge
    let enodes = [
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should fail to create two edges with the same keys as deleted edges`
      },
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should fail to create two edges with the same keys as deleted edges`
      }
    ]

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes,
      qs: {
        returnNew: true
      }
    })

    enodes = JSON.parse(response.body)
    request.delete(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    })
    response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(enode => enode.new)
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code}:2`
    )

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody.forEach((resNode, idx) => {
      expect(resNode).to.be.an.instanceOf(Object)
      expect(resNode.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code
      )
      expect(resNode.errorMessage).to.include(
        `Event log found for node with _id: ${enodes[idx]._id}`
      )
    })
  })
})
