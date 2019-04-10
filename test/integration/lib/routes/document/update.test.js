/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/init')
const request = require('@arangodb/request')
const { baseUrl } = module.context
const { errors: ARANGO_ERRORS } = require('@arangodb')

describe('Routes - update', () => {
  before(init.setup)

  after(init.teardown)

  it('should fail when updating a vertex where ignoreRevs is false and _rev match fails', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should fail when updating a vertex where ignoreRevs is false and _rev match fails`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    node = JSON.parse(response.body)
    node.k1 = 'v2'
    node._rev = 'mismatched_rev'

    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true,
        ignoreRevs: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code}:1`
    )
  })

  it('should update a vertex where ignoreRevs is false and _rev matches', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should update a vertex where ignoreRevs is false and _rev matches`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    node = JSON.parse(response.body)
    node.k1 = 'v2'

    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true,
        ignoreRevs: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(node._id)
    expect(resBody._key).to.equal(node._key)
    expect(resBody._rev).to.not.equal(node._rev)
    expect(resBody.k1).to.equal('v2')
    expect(resBody.k2).to.equal('v1')
  })

  it('should update a single vertex where ignoreRevs is true, irrespective of _rev', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should update a single vertex where ignoreRevs is true, irrespective of _rev`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    node = JSON.parse(response.body)
    node.k1 = 'v2'
    node._rev = 'mismatched_rev'

    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true,
        ignoreRevs: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(node._id)
    expect(resBody._key).to.equal(node._key)
    expect(resBody._rev).to.not.equal(node._rev)
    expect(resBody.k1).to.equal('v2')
    expect(resBody.k2).to.equal('v1')
  })

  it('should remove null values in a single vertex when keepNull is false', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should remove null values in a single vertex when keepNull is false`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    node = JSON.parse(response.body)
    node.k1 = null

    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true,
        keepNull: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(node._id)
    expect(resBody._key).to.equal(node._key)
    expect(resBody._rev).to.not.equal(node._rev)
    expect(resBody).to.not.have.property('k1')
    expect(resBody.k2).to.equal('v1')
  })

  it('should preserve null values in a vertex when keepNull is true', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      k2: 'v1',
      src: `${__filename}:should preserve null values in a vertex when keepNull is true`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    node = JSON.parse(response.body)
    node.k1 = null

    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true,
        keepNull: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(node._id)
    expect(resBody._key).to.equal(node._key)
    expect(resBody._rev).to.not.equal(node._rev)
    // noinspection BadExpressionStatementJS
    expect(resBody.k1).to.be.null
    expect(resBody.k2).to.equal('v1')
  })

  it('should replace objects in a vertex when mergeObjects is false', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: { a: 1 },
      k2: 'v1',
      src: `${__filename}:should replace objects in a vertex when mergeObjects is false`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    node = JSON.parse(response.body)
    node.k1 = { b: 1 }

    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true,
        mergeObjects: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(node._id)
    expect(resBody._key).to.equal(node._key)
    expect(resBody._rev).to.not.equal(node._rev)
    // noinspection BadExpressionStatementJS
    expect(resBody.k1).to.deep.equal({ b: 1 })
    expect(resBody.k2).to.equal('v1')
  })

  it('should merge objects in a vertex when mergeObjects is true', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: { a: 1 },
      k2: 'v1',
      src: `${__filename}:should merge objects in a vertex when mergeObjects is true`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    node = JSON.parse(response.body)
    node.k1 = { b: 1 }

    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true,
        mergeObjects: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(node._id)
    expect(resBody._key).to.equal(node._key)
    expect(resBody._rev).to.not.equal(node._rev)
    // noinspection BadExpressionStatementJS
    expect(resBody.k1).to.deep.equal({ b: 1, a: 1 })
    expect(resBody.k2).to.equal('v1')
  })

  it('should fail when updating two vertices where ignoreRevs is false and _rev match fails', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        k2: 'v1',
        src: `${__filename}:should fail when updating two vertices where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        k2: 'v1',
        src: `${__filename}:should fail when updating two vertices where ignoreRevs is false and _rev match fails`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    nodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes.map(node => {
        node.k1 = 'v2'
        node._rev = 'mismatched_rev'

        return node
      }),
      qs: {
        returnNew: true,
        ignoreRevs: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code}:2`
    )
  })

  it('should update two vertices where ignoreRevs is false and _rev matches', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        k2: 'v1',
        src: `${__filename}:should update two vertices where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        k2: 'v1',
        src: `${__filename}:should update two vertices where ignoreRevs is false and _rev matches`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    nodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes.map(node => {
        node.k1 = 'v2'

        return node
      }),
      qs: {
        returnNew: true,
        ignoreRevs: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(nodes[idx]._id)
        expect(resNode._key).to.equal(nodes[idx]._key)
        expect(resNode._rev).to.not.equal(nodes[idx]._rev)
        expect(resNode.k1).to.equal('v2')
        expect(resNode.k2).to.equal('v1')
      })
  })

  it('should update two vertices where ignoreRevs is true, irrespective of _rev', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        k2: 'v1',
        src: `${__filename}:should update two vertices where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        k2: 'v1',
        src: `${__filename}:should update two vertices where ignoreRevs is true, irrespective of _rev`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    nodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes.map(node => {
        node.k1 = 'v2'
        node._rev = 'mismatched_rev'

        return node
      }),
      qs: {
        returnNew: true,
        ignoreRevs: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(nodes[idx]._id)
        expect(resNode._key).to.equal(nodes[idx]._key)
        expect(resNode._rev).to.not.equal(nodes[idx]._rev)
        expect(resNode.k1).to.equal('v2')
        expect(resNode.k2).to.equal('v1')
      })
  })

  it('should remove null values from two vertices when keepNull is false', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        k2: 'v1',
        src: `${__filename}:should remove null values from two vertices when keepNull is false`
      },
      {
        k1: 'v1',
        k2: 'v1',
        src: `${__filename}:should remove null values from two vertices when keepNull is false`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    nodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes.map(node => {
        node.k1 = null

        return node
      }),
      qs: {
        returnNew: true,
        keepNull: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(nodes[idx]._id)
        expect(resNode._key).to.equal(nodes[idx]._key)
        expect(resNode._rev).to.not.equal(nodes[idx]._rev)
        expect(resNode).to.not.have.property('k1')
        expect(resNode.k2).to.equal('v1')
      })
  })

  it('should preserve null values in two vertices when keepNull is true', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        k2: 'v1',
        src: `${__filename}:should preserve null values in two vertices when keepNull is true`
      },
      {
        k1: 'v1',
        k2: 'v1',
        src: `${__filename}:should preserve null values in two vertices when keepNull is true`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    nodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes.map(node => {
        node.k1 = null

        return node
      }),
      qs: {
        returnNew: true,
        keepNull: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(nodes[idx]._id)
        expect(resNode._key).to.equal(nodes[idx]._key)
        expect(resNode._rev).to.not.equal(nodes[idx]._rev)
        // noinspection BadExpressionStatementJS
        expect(resNode.k1).to.be.null
        expect(resNode.k2).to.equal('v1')
      })
  })

  it('should replace objects in two vertices when mergeObjects is false', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: { a: 1 },
        k2: 'v1',
        src: `${__filename}:should replace objects in two vertices when mergeObjects is false`
      },
      {
        k1: { a: 1 },
        k2: 'v1',
        src: `${__filename}:should replace objects in two vertices when mergeObjects is false`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    nodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes.map(node => {
        node.k1 = { b: 1 }

        return node
      }),
      qs: {
        returnNew: true,
        mergeObjects: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(nodes[idx]._id)
        expect(resNode._key).to.equal(nodes[idx]._key)
        expect(resNode._rev).to.not.equal(nodes[idx]._rev)
        // noinspection BadExpressionStatementJS
        expect(resNode.k1).to.deep.equal({ b: 1 })
        expect(resNode.k2).to.equal('v1')
      })
  })

  it('should merge objects in two vertices when mergeObjects is true', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: { a: 1 },
        k2: 'v1',
        src: `${__filename}:should merge objects in two vertices when mergeObjects is true`
      },
      {
        k1: { a: 1 },
        k2: 'v1',
        src: `${__filename}:should merge objects in two vertices when mergeObjects is true`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    nodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes.map(node => {
        node.k1 = { b: 1 }

        return node
      }),
      qs: {
        returnNew: true,
        mergeObjects: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(nodes[idx]._id)
        expect(resNode._key).to.equal(nodes[idx]._key)
        expect(resNode._rev).to.not.equal(nodes[idx]._rev)
        // noinspection BadExpressionStatementJS
        expect(resNode.k1).to.deep.equal({ b: 1, a: 1 })
        expect(resNode.k2).to.equal('v1')
      })
  })

  it('should fail when updating an edge where ignoreRevs is false and _rev match fails', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail when updating an edge where ignoreRevs is false and _rev match fails`
      },
      {
        src: `${__filename}:should fail when updating an edge where ignoreRevs is false and _rev match fails`
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
      k2: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      src: `${__filename}:should fail when updating an edge where ignoreRevs is false and _rev match fails`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    enode = JSON.parse(response.body)
    enode.k1 = 'v2'
    enode._rev = 'mismatched_rev'

    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true,
        ignoreRevs: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code}:1`
    )
  })

  it('should update an edge where ignoreRevs is false and _rev matches', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should update an edge where ignoreRevs is false and _rev matches`
      },
      {
        src: `${__filename}:should update an edge where ignoreRevs is false and _rev matches`
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
      k2: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      src: `${__filename}:should update an edge where ignoreRevs is false and _rev matches`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    enode = JSON.parse(response.body)
    enode.k1 = 'v2'

    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true,
        ignoreRevs: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(enode._id)
    expect(resBody._key).to.equal(enode._key)
    expect(resBody._rev).to.not.equal(enode._rev)
    expect(resBody.k1).to.equal('v2')
    expect(resBody.k2).to.equal('v1')
    expect(resBody._from).to.equal(vnodes[0]._id)
    expect(resBody._to).to.equal(vnodes[1]._id)
  })

  it('should update a single edge where ignoreRevs is true, irrespective of _rev', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should update a single edge where ignoreRevs is true, irrespective of _rev`
      },
      {
        src: `${__filename}:should update a single edge where ignoreRevs is true, irrespective of _rev`
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
      k2: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      src: `${__filename}:should update a single edge where ignoreRevs is true, irrespective of _rev`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    enode = JSON.parse(response.body)
    enode.k1 = 'v2'
    enode._rev = 'mismatched_rev'

    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true,
        ignoreRevs: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(enode._id)
    expect(resBody._key).to.equal(enode._key)
    expect(resBody._rev).to.not.equal(enode._rev)
    expect(resBody.k1).to.equal('v2')
    expect(resBody.k2).to.equal('v1')
    expect(resBody._from).to.equal(vnodes[0]._id)
    expect(resBody._to).to.equal(vnodes[1]._id)
  })

  it('should remove null values from an edge when keepNull is false', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should remove null values from an edge when keepNull is false`
      },
      {
        src: `${__filename}:should remove null values from an edge when keepNull is false`
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
      k2: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      src: `${__filename}:should remove null values from an edge when keepNull is false`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    enode = JSON.parse(response.body)
    enode.k1 = null

    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true,
        keepNull: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(enode._id)
    expect(resBody._key).to.equal(enode._key)
    expect(resBody._rev).to.not.equal(enode._rev)
    expect(resBody).to.not.have.property('k1')
    expect(resBody.k2).to.equal('v1')
    expect(resBody._from).to.equal(vnodes[0]._id)
    expect(resBody._to).to.equal(vnodes[1]._id)
  })

  it('should preserve null values in an edge when keepNull is true', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should preserve null values in an edge when keepNull is true`
      },
      {
        src: `${__filename}:should preserve null values in an edge when keepNull is true`
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
      k2: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      src: `${__filename}:should preserve null values in an edge when keepNull is true`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    enode = JSON.parse(response.body)
    enode.k1 = null

    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true,
        keepNull: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(enode._id)
    expect(resBody._key).to.equal(enode._key)
    expect(resBody._rev).to.not.equal(enode._rev)
    // noinspection BadExpressionStatementJS
    expect(resBody.k1).to.be.null
    expect(resBody.k2).to.equal('v1')
    expect(resBody._from).to.equal(vnodes[0]._id)
    expect(resBody._to).to.equal(vnodes[1]._id)
  })

  it('should replace objects in an edge when mergeObjects is false', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should replace objects in an edge when mergeObjects is false`
      },
      {
        src: `${__filename}:should replace objects in an edge when mergeObjects is false`
      }
    ]
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    })
    vnodes = JSON.parse(vResponse.body)

    const eCollName = init.TEST_DATA_COLLECTIONS.edge
    let enode = {
      k1: { a: 1 },
      k2: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      src: `${__filename}:should replace objects in an edge when mergeObjects is false`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    enode = JSON.parse(response.body)
    enode.k1 = { b: 1 }

    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true,
        mergeObjects: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(enode._id)
    expect(resBody._key).to.equal(enode._key)
    expect(resBody._rev).to.not.equal(enode._rev)
    // noinspection BadExpressionStatementJS
    expect(resBody.k1).to.deep.equal({ b: 1 })
    expect(resBody.k2).to.equal('v1')
    expect(resBody._from).to.equal(vnodes[0]._id)
    expect(resBody._to).to.equal(vnodes[1]._id)
  })

  it('should merge objects in a vertex when mergeObjects is true', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should merge objects in a vertex when mergeObjects is true`
      },
      {
        src: `${__filename}:should merge objects in a vertex when mergeObjects is true`
      }
    ]
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    })
    vnodes = JSON.parse(vResponse.body)

    const eCollName = init.TEST_DATA_COLLECTIONS.edge
    let enode = {
      k1: { a: 1 },
      k2: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      src: `${__filename}:should merge objects in a vertex when mergeObjects is true`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    enode = JSON.parse(response.body)
    enode.k1 = { b: 1 }

    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true,
        mergeObjects: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body).new
    expect(resBody).to.be.an.instanceOf(Object)
    expect(resBody._id).to.equal(enode._id)
    expect(resBody._key).to.equal(enode._key)
    expect(resBody._rev).to.not.equal(enode._rev)
    // noinspection BadExpressionStatementJS
    expect(resBody.k1).to.deep.equal({ b: 1, a: 1 })
    expect(resBody.k2).to.equal('v1')
    expect(resBody._from).to.equal(vnodes[0]._id)
    expect(resBody._to).to.equal(vnodes[1]._id)
  })

  it('should fail when updating two edges where ignoreRevs is false and _rev match fails', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail when updating two edges where ignoreRevs is false and _rev match fails`
      },
      {
        src: `${__filename}:should fail when updating two edges where ignoreRevs is false and _rev match fails`
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
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should fail when updating two edges where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should fail when updating two edges where ignoreRevs is false and _rev match fails`
      }
    ]

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    })

    enodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(node => {
        node.k1 = 'v2'
        node._rev = 'mismatched_rev'

        return node
      }),
      qs: {
        returnNew: true,
        ignoreRevs: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code}:2`
    )
  })

  it('should update two edges where ignoreRevs is false and _rev matches', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should update two edges where ignoreRevs is false and _rev matches`
      },
      {
        src: `${__filename}:should update two edges where ignoreRevs is false and _rev matches`
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
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should update two edges where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should update two edges where ignoreRevs is false and _rev matches`
      }
    ]

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    })

    enodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(node => {
        node.k1 = 'v2'

        return node
      }),
      qs: {
        returnNew: true,
        ignoreRevs: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(enodes[idx]._id)
        expect(resNode._key).to.equal(enodes[idx]._key)
        expect(resNode._rev).to.not.equal(enodes[idx]._rev)
        expect(resNode.k1).to.equal('v2')
        expect(resNode.k2).to.equal('v1')
        expect(resNode._from).to.equal(vnodes[0]._id)
        expect(resNode._to).to.equal(vnodes[1]._id)
      })
  })

  it('should update two edges where ignoreRevs is true, irrespective of _rev', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should update two edges where ignoreRevs is true, irrespective of _rev`
      },
      {
        src: `${__filename}:should update two edges where ignoreRevs is true, irrespective of _rev`
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
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should update two edges where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should update two edges where ignoreRevs is true, irrespective of _rev`
      }
    ]

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    })

    enodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(node => {
        node.k1 = 'v2'
        node._rev = 'mismatched_rev'

        return node
      }),
      qs: {
        returnNew: true,
        ignoreRevs: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(enodes[idx]._id)
        expect(resNode._key).to.equal(enodes[idx]._key)
        expect(resNode._rev).to.not.equal(enodes[idx]._rev)
        expect(resNode.k1).to.equal('v2')
        expect(resNode.k2).to.equal('v1')
        expect(resNode._from).to.equal(vnodes[0]._id)
        expect(resNode._to).to.equal(vnodes[1]._id)
      })
  })

  it('should remove null values from two edges when keepNull is false', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should remove null values from two edges when keepNull is false`
      },
      {
        src: `${__filename}:should remove null values from two edges when keepNull is false`
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
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should remove null values from two edges when keepNull is false`
      },
      {
        k1: 'v1',
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should remove null values from two edges when keepNull is false`
      }
    ]

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    })

    enodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(node => {
        node.k1 = null

        return node
      }),
      qs: {
        returnNew: true,
        keepNull: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(enodes[idx]._id)
        expect(resNode._key).to.equal(enodes[idx]._key)
        expect(resNode._rev).to.not.equal(enodes[idx]._rev)
        expect(resNode).to.not.have.property('k1')
        expect(resNode.k2).to.equal('v1')
        expect(resNode._from).to.equal(vnodes[0]._id)
        expect(resNode._to).to.equal(vnodes[1]._id)
      })
  })

  it('should preserve null values in two edges when keepNull is true', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should preserve null values in two edges when keepNull is true`
      },
      {
        src: `${__filename}:should preserve null values in two edges when keepNull is true`
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
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should preserve null values in two edges when keepNull is true`
      },
      {
        k1: 'v1',
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should preserve null values in two edges when keepNull is true`
      }
    ]

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    })

    enodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(node => {
        node.k1 = null

        return node
      }),
      qs: {
        returnNew: true,
        keepNull: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(enodes[idx]._id)
        expect(resNode._key).to.equal(enodes[idx]._key)
        expect(resNode._rev).to.not.equal(enodes[idx]._rev)
        // noinspection BadExpressionStatementJS
        expect(resNode.k1).to.be.null
        expect(resNode.k2).to.equal('v1')
        expect(resNode._from).to.equal(vnodes[0]._id)
        expect(resNode._to).to.equal(vnodes[1]._id)
      })
  })

  it('should replace objects in two edges when mergeObjects is false', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should replace objects in two edges when mergeObjects is false`
      },
      {
        src: `${__filename}:should replace objects in two edges when mergeObjects is false`
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
        k1: { a: 1 },
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should replace objects in two edges when mergeObjects is false`
      },
      {
        k1: { a: 1 },
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should replace objects in two edges when mergeObjects is false`
      }
    ]

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    })

    enodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(node => {
        node.k1 = { b: 1 }

        return node
      }),
      qs: {
        returnNew: true,
        mergeObjects: false
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(enodes[idx]._id)
        expect(resNode._key).to.equal(enodes[idx]._key)
        expect(resNode._rev).to.not.equal(enodes[idx]._rev)
        // noinspection BadExpressionStatementJS
        expect(resNode.k1).to.deep.equal({ b: 1 })
        expect(resNode.k2).to.equal('v1')
        expect(resNode._from).to.equal(vnodes[0]._id)
        expect(resNode._to).to.equal(vnodes[1]._id)
      })
  })

  it('should merge objects in two edges when mergeObjects is true', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should merge objects in two edges when mergeObjects is true`
      },
      {
        src: `${__filename}:should merge objects in two edges when mergeObjects is true`
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
        k1: { a: 1 },
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should merge objects in two edges when mergeObjects is true`
      },
      {
        k1: { a: 1 },
        k2: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should merge objects in two edges when mergeObjects is true`
      }
    ]

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    })

    enodes = JSON.parse(response.body)
    response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(node => {
        node.k1 = { b: 1 }

        return node
      }),
      qs: {
        returnNew: true,
        mergeObjects: true
      }
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(200)

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody
      .map(node => node.new)
      .forEach((resNode, idx) => {
        expect(resNode).to.be.an.instanceOf(Object)
        expect(resNode._id).to.equal(enodes[idx]._id)
        expect(resNode._key).to.equal(enodes[idx]._key)
        expect(resNode._rev).to.not.equal(enodes[idx]._rev)
        // noinspection BadExpressionStatementJS
        expect(resNode.k1).to.deep.equal({ b: 1, a: 1 })
        expect(resNode.k2).to.equal('v1')
        expect(resNode._from).to.equal(vnodes[0]._id)
        expect(resNode._to).to.equal(vnodes[1]._id)
      })
  })

  it('should fail to update a single vertex with a non-existent key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail to update a single vertex with a non-existent key`
    }

    const response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code}:1`
    )
  })

  it('should fail to update two vertices with non-existent keys', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:should fail to update two vertices with non-existent keys`
      },
      {
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:should fail to update two vertices with non-existent keys`
      }
    ]

    const response = request.patch(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code}:2`
    )

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody.forEach(resNode => {
      expect(resNode).to.be.an.instanceOf(Object)
      expect(resNode.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
      // noinspection BadExpressionStatementJS
      expect(resNode.errorMessage).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.message
      )
    })
  })

  it('should fail to update a single edge with a non-existent key', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail to update a single edge with a non-existent key`
      },
      {
        src: `${__filename}:should fail to update a single edge with a non-existent key`
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
      _key: 'does-not-exist',
      src: `${__filename}:should fail to update a single edge with a non-existent key`
    }

    const response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code}:1`
    )
  })

  it('should fail to update two edges with non-existent keys', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail to update two edges with non-existent keys`
      },
      {
        src: `${__filename}:should fail to update two edges with non-existent keys`
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
        _key: 'does-not-exist',
        src: `${__filename}:should fail to update two edges with non-existent keys`
      },
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        _key: 'does-not-exist',
        src: `${__filename}:should fail to update two edges with non-existent keys`
      }
    ]

    const response = request.patch(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code}:2`
    )

    const resBody = JSON.parse(response.body)
    expect(resBody).to.be.an.instanceOf(Array)
    resBody.forEach(resNode => {
      expect(resNode).to.be.an.instanceOf(Object)
      expect(resNode.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
      // noinspection BadExpressionStatementJS
      expect(resNode.errorMessage).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.message
      )
    })
  })
})
