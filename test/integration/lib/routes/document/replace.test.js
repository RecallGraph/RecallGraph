'use strict'

const { expect } = require('chai')
const init = require('../../../../helpers/init')
const request = require('@arangodb/request')
const { baseUrl } = module.context
const { errors: ARANGO_ERRORS } = require('@arangodb')

describe('Routes - replace', () => {
  before(init.setup)

  after(init.teardown)

  it('should fail when replacing a vertex where ignoreRevs is false and _rev match fails', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      src: `${__filename}:should fail when replacing a vertex where ignoreRevs is false and _rev match fails`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true
      }
    })

    node = JSON.parse(response.body).new
    node.k1 = 'v2'
    node._rev = 'mismatched_rev'

    response = request.put(`${baseUrl}/document/${collName}`, {
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

  it('should replace a vertex where ignoreRevs is false and _rev matches', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      src: `${__filename}:should replace a vertex where ignoreRevs is false and _rev matches`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true
      }
    })

    node = JSON.parse(response.body).new
    node.k1 = 'v2'

    response = request.put(`${baseUrl}/document/${collName}`, {
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
  })

  it('should replace a single vertex where ignoreRevs is true, irrespective of _rev', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      src: `${__filename}:should replace a single vertex where ignoreRevs is true, irrespective of _rev`
    }

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node,
      qs: {
        returnNew: true
      }
    })

    node = JSON.parse(response.body).new
    node.k1 = 'v2'
    node._rev = 'mismatched_rev'

    response = request.put(`${baseUrl}/document/${collName}`, {
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
  })

  it('should fail when replacing two vertices where ignoreRevs is false and _rev match fails', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two vertices where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two vertices where ignoreRevs is false and _rev match fails`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes,
      qs: {
        returnNew: true
      }
    })

    nodes = JSON.parse(response.body)
    response = request.put(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes.map(node => {
        node.new.k1 = 'v2'
        node.new._rev = 'mismatched_rev'

        return node.new
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

  it('should replace two vertices where ignoreRevs is false and _rev matches', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is false and _rev matches`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes,
      qs: {
        returnNew: true
      }
    })

    nodes = JSON.parse(response.body)
    response = request.put(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes.map(node => {
        node.new.k1 = 'v2'

        return node.new
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
      })
  })

  it('should replace two vertices where ignoreRevs is true, irrespective of _rev', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is true, irrespective of _rev`
      }
    ]

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes,
      qs: {
        returnNew: true
      }
    })

    nodes = JSON.parse(response.body)
    response = request.put(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes.map(node => {
        node.new.k1 = 'v2'
        node.new._rev = 'mismatched_rev'

        return node.new
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
      })
  })

  it('should fail when replacing an edge where ignoreRevs is false and _rev match fails', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail when replacing an edge where ignoreRevs is false and _rev match fails`
      },
      {
        src: `${__filename}:should fail when replacing an edge where ignoreRevs is false and _rev match fails`
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
      src: `${__filename}:should fail when replacing an edge where ignoreRevs is false and _rev match fails`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true
      }
    })

    enode = JSON.parse(response.body).new
    enode.k1 = 'v2'
    enode._rev = 'mismatched_rev'

    response = request.put(`${baseUrl}/document/${eCollName}`, {
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

  it('should replace an edge where ignoreRevs is false and _rev matches', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should replace an edge where ignoreRevs is false and _rev matches`
      },
      {
        src: `${__filename}:should replace an edge where ignoreRevs is false and _rev matches`
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
      src: `${__filename}:should replace an edge where ignoreRevs is false and _rev matches`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true
      }
    })

    enode = JSON.parse(response.body).new
    enode.k1 = 'v2'

    response = request.put(`${baseUrl}/document/${eCollName}`, {
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
    expect(resBody._from).to.equal(vnodes[0]._id)
    expect(resBody._to).to.equal(vnodes[1]._id)
  })

  it('should replace a single edge where ignoreRevs is true, irrespective of _rev', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should replace a single edge where ignoreRevs is true, irrespective of _rev`
      },
      {
        src: `${__filename}:should replace a single edge where ignoreRevs is true, irrespective of _rev`
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
      src: `${__filename}:should replace a single edge where ignoreRevs is true, irrespective of _rev`
    }

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode,
      qs: {
        returnNew: true
      }
    })

    enode = JSON.parse(response.body).new
    enode.k1 = 'v2'
    enode._rev = 'mismatched_rev'

    response = request.put(`${baseUrl}/document/${eCollName}`, {
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
    expect(resBody._from).to.equal(vnodes[0]._id)
    expect(resBody._to).to.equal(vnodes[1]._id)
  })

  it('should fail when replacing two edges where ignoreRevs is false and _rev match fails', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
      },
      {
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
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
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
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
    response = request.put(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(node => {
        node.new.k1 = 'v2'
        node.new._rev = 'mismatched_rev'

        return node.new
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

  it('should replace two edges where ignoreRevs is false and _rev matches', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
      },
      {
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
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
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
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
    response = request.put(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(node => {
        node.new.k1 = 'v2'

        return node.new
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
        expect(resNode._from).to.equal(vnodes[0]._id)
        expect(resNode._to).to.equal(vnodes[1]._id)
      })
  })

  it('should replace two edges where ignoreRevs is true, irrespective of _rev', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
      },
      {
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
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
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
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
    response = request.put(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes.map(node => {
        node.new.k1 = 'v2'
        node.new._rev = 'mismatched_rev'

        return node.new
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
        expect(resNode._from).to.equal(vnodes[0]._id)
        expect(resNode._to).to.equal(vnodes[1]._id)
      })
  })

  it('should fail to replace a single vertex with a non-existent key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let node = {
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail to replace a single vertex with a non-existent key`
    }

    const response = request.put(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code}:1`
    )
  })

  it('should fail to replace two vertices with non-existent keys', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex
    let nodes = [
      {
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:should fail to replace two vertices with non-existent keys`
      },
      {
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:should fail to replace two vertices with non-existent keys`
      }
    ]

    const response = request.put(`${baseUrl}/document/${collName}`, {
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

  it('should fail to replace a single edge with a non-existent key', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail to replace a single edge with a non-existent key`
      },
      {
        src: `${__filename}:should fail to replace a single edge with a non-existent key`
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
      src: `${__filename}:should fail to replace a single edge with a non-existent key`
    }

    const response = request.put(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    })

    expect(response).to.be.an.instanceOf(Object)
    expect(response.statusCode).to.equal(412)
    expect(response.headers['x-arango-error-codes']).to.equal(
      `${ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code}:1`
    )
  })

  it('should fail to replace two edges with non-existent keys', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex
    let vnodes = [
      {
        src: `${__filename}:should fail to replace two edges with non-existent keys`
      },
      {
        src: `${__filename}:should fail to replace two edges with non-existent keys`
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
        src: `${__filename}:should fail to replace two edges with non-existent keys`
      },
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        _key: 'does-not-exist',
        src: `${__filename}:should fail to replace two edges with non-existent keys`
      }
    ]

    const response = request.put(`${baseUrl}/document/${eCollName}`, {
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
