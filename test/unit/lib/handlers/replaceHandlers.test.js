'use strict'

const { expect } = require('chai')
const init = require('../../../helpers/util/init')
const {
  replaceSingle, replaceMultiple, replaceProvider
} = require('../../../../lib/handlers/replaceHandlers')
const {
  createSingle, createMultiple
} = require('../../../../lib/handlers/createHandlers')
const { errors: ARANGO_ERRORS } = require('@arangodb')

describe('Replace Handlers', () => {
  before(init.setup)

  after(init.teardown)

  it('should fail when replacing a vertex where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should fail when replacing a vertex where ignoreRevs is false and _rev match fails`
    }

    const cnode = createSingle({ pathParams, body })
    cnode.k1 = 'v2'
    cnode._rev = 'mismatched_rev'

    expect(() =>
      replaceSingle({ pathParams, body: cnode }, { ignoreRevs: false })
    )
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should replace a vertex where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should replace a vertex where ignoreRevs is false and _rev matches`
    }

    const cnode = createSingle({ pathParams, body })
    cnode.k1 = 'v2'

    const rnode = replaceSingle(
      { pathParams, body: cnode },
      { returnNew: true, ignoreRevs: false }
    ).new

    expect(rnode).to.be.an.instanceOf(Object)
    expect(rnode._id).to.equal(cnode._id)
    expect(rnode._key).to.equal(cnode._key)
    expect(rnode.k1).to.equal('v2')
    expect(rnode._rev).to.not.equal(cnode._rev)
  })

  it('should replace a single vertex where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should replace a single vertex where ignoreRevs is true, irrespective of _rev`
    }

    const cnode = createSingle({ pathParams, body }, { returnNew: true }).new
    cnode.k1 = 'v2'
    cnode._rev = 'mismatched_rev'

    const rnode = replaceSingle(
      { pathParams, body: cnode },
      { returnNew: true, ignoreRevs: true }
    ).new

    expect(rnode).to.be.an.instanceOf(Object)
    expect(rnode._id).to.equal(cnode._id)
    expect(rnode._key).to.equal(cnode._key)
    expect(rnode.k1).to.equal('v2')
    expect(rnode._rev).to.not.equal(cnode._rev)
  })

  it('should fail when replacing two vertices where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two vertices where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two vertices where ignoreRevs is false and _rev match fails`
      }
    ]

    const cnodes = createMultiple({ pathParams, body }, { returnNew: true })

    const rnodes = replaceMultiple(
      {
        pathParams,
        body: cnodes.map(node => {
          node.new.k1 = 'v2'
          node.new._rev = 'mismatched_rev'

          return node.new
        })
      },
      { returnNew: true, ignoreRevs: false }
    )

    expect(rnodes).to.be.an.instanceOf(Array)
    expect(rnodes).to.have.lengthOf(2)
    rnodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
    })
  })

  it('should replace two vertices where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is false and _rev matches`
      }
    ]

    const cnodes = createMultiple({ pathParams, body }, { returnNew: true })

    const rnodes = replaceMultiple(
      {
        pathParams,
        body: cnodes.map(node => {
          node.new.k1 = 'v2'

          return node.new
        })
      },
      { returnNew: true, ignoreRevs: false }
    )

    expect(rnodes).to.be.an.instanceOf(Array)
    expect(rnodes).to.have.lengthOf(2)
    rnodes
      .map(node => node.new)
      .forEach((node, idx) => {
        expect(node).to.be.an.instanceOf(Object)
        expect(node._id).to.equal(cnodes[idx]._id)
        expect(node._key).to.equal(cnodes[idx]._key)
        expect(node.k1).to.equal('v2')
        expect(node._rev).to.not.equal(cnodes[idx]._rev)
      })
  })

  it('should replace two vertices where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is true, irrespective of _rev`
      }
    ]

    const cnodes = createMultiple({ pathParams, body }, { returnNew: true })

    const rnodes = replaceMultiple(
      {
        pathParams,
        body: cnodes.map(node => {
          node.new.k1 = 'v2'
          node.new._rev = 'mismatched_rev'

          return node.new
        })
      },
      { returnNew: true, ignoreRevs: true }
    )

    expect(rnodes).to.be.an.instanceOf(Array)
    expect(rnodes).to.have.lengthOf(2)
    rnodes
      .map(node => node.new)
      .forEach((node, idx) => {
        expect(node).to.be.an.instanceOf(Object)
        expect(node._id).to.equal(cnodes[idx]._id)
        expect(node._key).to.equal(cnodes[idx]._key)
        expect(node.k1).to.equal('v2')
        expect(node._rev).to.not.equal(cnodes[idx]._rev)
      })
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
        src: `${__filename}:sshould fail when replacing an edge where ignoreRevs is false and _rev match fails`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when replacing an edge where ignoreRevs is false and _rev match fails`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode.k1 = 'v2'
    ecnode._rev = 'mismatched_rev'

    expect(() =>
      replaceSingle({ pathParams, body: ecnode }, { ignoreRevs: false })
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

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should replace an edge where ignoreRevs is false and _rev matches`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode.k1 = 'v2'

    const ernode = replaceSingle(
      { pathParams, body: ecnode },
      { returnNew: true, ignoreRevs: false }
    ).new

    expect(ernode).to.be.an.instanceOf(Object)
    expect(ernode._id).to.equal(ecnode._id)
    expect(ernode._key).to.equal(ecnode._key)
    expect(ernode._from).to.equal(vnodes[0]._id)
    expect(ernode._to).to.equal(vnodes[1]._id)
    expect(ernode.k1).to.equal('v2')
    expect(ernode._rev).to.not.equal(ecnode._rev)
  })

  it('should replace an edge where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should replace an edge where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace an edge where ignoreRevs is true, irrespective of _rev`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should replace an edge where ignoreRevs is true, irrespective of _rev`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode.k1 = 'v2'
    ecnode._rev = 'mismatched_rev'

    const ernode = replaceSingle(
      { pathParams, body: ecnode },
      { returnNew: true, ignoreRevs: true }
    ).new

    expect(ernode).to.be.an.instanceOf(Object)
    expect(ernode._id).to.equal(ecnode._id)
    expect(ernode._key).to.equal(ecnode._key)
    expect(ernode._from).to.equal(vnodes[0]._id)
    expect(ernode._to).to.equal(vnodes[1]._id)
    expect(ernode.k1).to.equal('v2')
    expect(ernode._rev).to.not.equal(ecnode._rev)
  })

  it('should fail when replacing two edges where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const ecnodes = createMultiple(
      { pathParams, body: ebody },
      { returnNew: true }
    )

    const ernodes = replaceMultiple(
      {
        pathParams,
        body: ecnodes.map(node => {
          node.new.k1 = 'v2'
          node.new._rev = 'mismatched_rev'

          return node.new
        })
      },
      { returnNew: true, ignoreRevs: false }
    )

    expect(ernodes).to.be.an.instanceOf(Array)
    expect(ernodes).to.have.lengthOf(2)
    ernodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
    })
  })

  it('should replace two edges where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const ecnodes = createMultiple(
      { pathParams, body: ebody },
      { returnNew: true }
    )

    const ernodes = replaceMultiple(
      {
        pathParams,
        body: ecnodes.map(node => {
          node.new.k1 = 'v2'

          return node.new
        })
      },
      { returnNew: true, ignoreRevs: false }
    )

    expect(ernodes).to.be.an.instanceOf(Array)
    expect(ernodes).to.have.lengthOf(2)
    ernodes
      .map(node => node.new)
      .forEach((ernode, idx) => {
        expect(ernode).to.be.an.instanceOf(Object)
        expect(ernode._id).to.equal(ecnodes[idx]._id)
        expect(ernode._key).to.equal(ecnodes[idx]._key)
        expect(ernode._from).to.equal(vnodes[0]._id)
        expect(ernode._to).to.equal(vnodes[1]._id)
        expect(ernode.k1).to.equal('v2')
        expect(ernode._rev).to.not.equal(ecnodes[idx]._rev)
      })
  })

  it('should replace two edges where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const ecnodes = createMultiple(
      { pathParams, body: ebody },
      { returnNew: true }
    )

    const ernodes = replaceMultiple(
      {
        pathParams,
        body: ecnodes.map(node => {
          node.new.k1 = 'v2'
          node.new._rev = 'mismatched_rev'

          return node.new
        })
      },
      { returnNew: true, ignoreRevs: true }
    )

    expect(ernodes).to.be.an.instanceOf(Array)
    expect(ernodes).to.have.lengthOf(2)
    ernodes
      .map(node => node.new)
      .forEach((ernode, idx) => {
        expect(ernode).to.be.an.instanceOf(Object)
        expect(ernode._id).to.equal(ecnodes[idx]._id)
        expect(ernode._key).to.equal(ecnodes[idx]._key)
        expect(ernode._from).to.equal(vnodes[0]._id)
        expect(ernode._to).to.equal(vnodes[1]._id)
        expect(ernode.k1).to.equal('v2')
        expect(ernode._rev).to.not.equal(ecnodes[idx]._rev)
      })
  })

  it('should fail to replace a non-existent vertex', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = {
      _key: 'does-not-exist',
      k1: 'v1',
      src: `${__filename}:should fail to replace a non-existent vertex`
    }

    expect(() =>
      replaceSingle({
        pathParams,
        body
      })
    )
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })

  it('should fail to replace two non-existent vertices.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = [
      {
        _key: 'does-not-exist',
        k1: 'v1',
        src: `${__filename}:should fail to replace two non-existent vertices.`
      },
      {
        _key: 'does-not-exist',
        k1: 'v1',
        src: `${__filename}:should fail to replace two non-existent vertices.`
      }
    ]

    const nodes = replaceMultiple({ pathParams, body })

    expect(nodes).to.be.an.instanceOf(Array)
    nodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
    })
  })

  it('should fail to replace a non-existent edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail to replace a non-existent edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail to replace a non-existent edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail to replace a non-existent edge`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    expect(() =>
      replaceSingle({
        pathParams,
        body: ebody
      })
    )
      .to.throw()
      .with.property(
        'errorNum',
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
  })

  it('should fail when replacing two edges with non-existing keys', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges with non-existing keys`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges with non-existing keys`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:should fail when replacing two edges with non-existing keys`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:should fail when replacing two edges with non-existing keys`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const enodes = replaceMultiple({ pathParams, body: ebody })

    expect(enodes).to.be.an.instanceOf(Array)
    expect(enodes).to.have.lengthOf(2)
    enodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
    })
  })
})

describe('Replace Provider', () => {
  before(init.setup)

  after(init.teardown)

  it('should fail when replacing a vertex where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should fail when replacing a vertex where ignoreRevs is false and _rev match fails`
    }

    const cnode = createSingle({ pathParams, body })
    cnode.k1 = 'v2'
    cnode._rev = 'mismatched_rev'

    expect(() => replaceProvider(init.TEST_DATA_COLLECTIONS.vertex, cnode, { ignoreRevs: false }))
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
  })

  it('should replace a vertex where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should replace a vertex where ignoreRevs is false and _rev matches`
    }

    const cnode = createSingle({ pathParams, body })
    cnode.k1 = 'v2'

    const rnode = replaceProvider(init.TEST_DATA_COLLECTIONS.vertex, cnode,
      { returnNew: true, ignoreRevs: false }).new

    expect(rnode).to.be.an.instanceOf(Object)
    expect(rnode._id).to.equal(cnode._id)
    expect(rnode._key).to.equal(cnode._key)
    expect(rnode.k1).to.equal('v2')
    expect(rnode._rev).to.not.equal(cnode._rev)
  })

  it('should replace a single vertex where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = {
      k1: 'v1',
      src: `${__filename}:should replace a single vertex where ignoreRevs is true, irrespective of _rev`
    }

    const cnode = createSingle({ pathParams, body }, { returnNew: true }).new
    cnode.k1 = 'v2'
    cnode._rev = 'mismatched_rev'

    const rnode = replaceProvider(init.TEST_DATA_COLLECTIONS.vertex, cnode,
      { returnNew: true, ignoreRevs: true }).new

    expect(rnode).to.be.an.instanceOf(Object)
    expect(rnode._id).to.equal(cnode._id)
    expect(rnode._key).to.equal(cnode._key)
    expect(rnode.k1).to.equal('v2')
    expect(rnode._rev).to.not.equal(cnode._rev)
  })

  it('should fail when replacing two vertices where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two vertices where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two vertices where ignoreRevs is false and _rev match fails`
      }
    ]

    const cnodes = createMultiple({ pathParams, body }, { returnNew: true })

    const rnodes = replaceProvider(init.TEST_DATA_COLLECTIONS.vertex, cnodes.map(node => {
      node.new.k1 = 'v2'
      node.new._rev = 'mismatched_rev'

      return node.new
    }), { returnNew: true, ignoreRevs: false })

    expect(rnodes).to.be.an.instanceOf(Array)
    expect(rnodes).to.have.lengthOf(2)
    rnodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
    })
  })

  it('should replace two vertices where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is false and _rev matches`
      }
    ]

    const cnodes = createMultiple({ pathParams, body }, { returnNew: true })

    const rnodes = replaceProvider(init.TEST_DATA_COLLECTIONS.vertex, cnodes.map(node => {
      node.new.k1 = 'v2'

      return node.new
    }), { returnNew: true, ignoreRevs: false })

    expect(rnodes).to.be.an.instanceOf(Array)
    expect(rnodes).to.have.lengthOf(2)
    rnodes
      .map(node => node.new)
      .forEach((node, idx) => {
        expect(node).to.be.an.instanceOf(Object)
        expect(node._id).to.equal(cnodes[idx]._id)
        expect(node._key).to.equal(cnodes[idx]._key)
        expect(node.k1).to.equal('v2')
        expect(node._rev).to.not.equal(cnodes[idx]._rev)
      })
  })

  it('should replace two vertices where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace two vertices where ignoreRevs is true, irrespective of _rev`
      }
    ]

    const cnodes = createMultiple({ pathParams, body }, { returnNew: true })

    const rnodes = replaceProvider(init.TEST_DATA_COLLECTIONS.vertex, cnodes.map(node => {
      node.new.k1 = 'v2'
      node.new._rev = 'mismatched_rev'

      return node.new
    }), { returnNew: true, ignoreRevs: true })

    expect(rnodes).to.be.an.instanceOf(Array)
    expect(rnodes).to.have.lengthOf(2)
    rnodes
      .map(node => node.new)
      .forEach((node, idx) => {
        expect(node).to.be.an.instanceOf(Object)
        expect(node._id).to.equal(cnodes[idx]._id)
        expect(node._key).to.equal(cnodes[idx]._key)
        expect(node.k1).to.equal('v2')
        expect(node._rev).to.not.equal(cnodes[idx]._rev)
      })
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
        src: `${__filename}:sshould fail when replacing an edge where ignoreRevs is false and _rev match fails`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when replacing an edge where ignoreRevs is false and _rev match fails`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode.k1 = 'v2'
    ecnode._rev = 'mismatched_rev'

    expect(() => replaceProvider(init.TEST_DATA_COLLECTIONS.edge, ecnode, { ignoreRevs: false }))
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

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should replace an edge where ignoreRevs is false and _rev matches`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode.k1 = 'v2'

    const ernode = replaceProvider(init.TEST_DATA_COLLECTIONS.edge, ecnode,
      { returnNew: true, ignoreRevs: false }).new

    expect(ernode).to.be.an.instanceOf(Object)
    expect(ernode._id).to.equal(ecnode._id)
    expect(ernode._key).to.equal(ecnode._key)
    expect(ernode._from).to.equal(vnodes[0]._id)
    expect(ernode._to).to.equal(vnodes[1]._id)
    expect(ernode.k1).to.equal('v2')
    expect(ernode._rev).to.not.equal(ecnode._rev)
  })

  it('should replace an edge where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should replace an edge where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace an edge where ignoreRevs is true, irrespective of _rev`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should replace an edge where ignoreRevs is true, irrespective of _rev`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    const ecnode = createSingle(
      { pathParams, body: ebody },
      { returnNew: true }
    ).new
    ecnode.k1 = 'v2'
    ecnode._rev = 'mismatched_rev'

    const ernode = replaceProvider(init.TEST_DATA_COLLECTIONS.edge, ecnode,
      { returnNew: true, ignoreRevs: true }).new

    expect(ernode).to.be.an.instanceOf(Object)
    expect(ernode._id).to.equal(ecnode._id)
    expect(ernode._key).to.equal(ecnode._key)
    expect(ernode._from).to.equal(vnodes[0]._id)
    expect(ernode._to).to.equal(vnodes[1]._id)
    expect(ernode.k1).to.equal('v2')
    expect(ernode._rev).to.not.equal(ecnode._rev)
  })

  it('should fail when replacing two edges where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges where ignoreRevs is false and _rev match fails`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const ecnodes = createMultiple(
      { pathParams, body: ebody },
      { returnNew: true }
    )

    const ernodes = replaceProvider(init.TEST_DATA_COLLECTIONS.edge, ecnodes.map(node => {
      node.new.k1 = 'v2'
      node.new._rev = 'mismatched_rev'

      return node.new
    }), { returnNew: true, ignoreRevs: false })

    expect(ernodes).to.be.an.instanceOf(Array)
    expect(ernodes).to.have.lengthOf(2)
    ernodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code)
    })
  })

  it('should replace two edges where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is false and _rev matches`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const ecnodes = createMultiple(
      { pathParams, body: ebody },
      { returnNew: true }
    )

    const ernodes = replaceProvider(init.TEST_DATA_COLLECTIONS.edge, ecnodes.map(node => {
      node.new.k1 = 'v2'

      return node.new
    }), { returnNew: true, ignoreRevs: false })

    expect(ernodes).to.be.an.instanceOf(Array)
    expect(ernodes).to.have.lengthOf(2)
    ernodes
      .map(node => node.new)
      .forEach((ernode, idx) => {
        expect(ernode).to.be.an.instanceOf(Object)
        expect(ernode._id).to.equal(ecnodes[idx]._id)
        expect(ernode._key).to.equal(ecnodes[idx]._key)
        expect(ernode._from).to.equal(vnodes[0]._id)
        expect(ernode._to).to.equal(vnodes[1]._id)
        expect(ernode.k1).to.equal('v2')
        expect(ernode._rev).to.not.equal(ecnodes[idx]._rev)
      })
  })

  it('should replace two edges where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should replace two edges where ignoreRevs is true, irrespective of _rev`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const ecnodes = createMultiple(
      { pathParams, body: ebody },
      { returnNew: true }
    )

    const ernodes = replaceProvider(init.TEST_DATA_COLLECTIONS.edge, ecnodes.map(node => {
      node.new.k1 = 'v2'
      node.new._rev = 'mismatched_rev'

      return node.new
    }), { returnNew: true, ignoreRevs: true })

    expect(ernodes).to.be.an.instanceOf(Array)
    expect(ernodes).to.have.lengthOf(2)
    ernodes
      .map(node => node.new)
      .forEach((ernode, idx) => {
        expect(ernode).to.be.an.instanceOf(Object)
        expect(ernode._id).to.equal(ecnodes[idx]._id)
        expect(ernode._key).to.equal(ecnodes[idx]._key)
        expect(ernode._from).to.equal(vnodes[0]._id)
        expect(ernode._to).to.equal(vnodes[1]._id)
        expect(ernode.k1).to.equal('v2')
        expect(ernode._rev).to.not.equal(ecnodes[idx]._rev)
      })
  })

  it('should fail to replace a non-existent vertex', () => {
    const body = {
      _key: 'does-not-exist',
      k1: 'v1',
      src: `${__filename}:should fail to replace a non-existent vertex`
    }

    expect(() => replaceProvider(init.TEST_DATA_COLLECTIONS.vertex, body))
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code)
  })

  it('should fail to replace two non-existent vertices.', () => {
    const body = [
      {
        _key: 'does-not-exist',
        k1: 'v1',
        src: `${__filename}:should fail to replace two non-existent vertices.`
      },
      {
        _key: 'does-not-exist',
        k1: 'v1',
        src: `${__filename}:should fail to replace two non-existent vertices.`
      }
    ]

    const nodes = replaceProvider(init.TEST_DATA_COLLECTIONS.vertex, body)

    expect(nodes).to.be.an.instanceOf(Array)
    nodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
    })
  })

  it('should fail to replace a non-existent edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail to replace a non-existent edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail to replace a non-existent edge`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail to replace a non-existent edge`
    }
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge

    expect(() => replaceProvider(init.TEST_DATA_COLLECTIONS.edge, ebody))
      .to.throw()
      .with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code)
  })

  it('should fail when replacing two edges with non-existing keys', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    }
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges with non-existing keys`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when replacing two edges with non-existing keys`
      }
    ]
    const vnodes = createMultiple({ pathParams, body: vbody })

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:should fail when replacing two edges with non-existing keys`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:should fail when replacing two edges with non-existing keys`
      }
    ]
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge
    const enodes = replaceProvider(init.TEST_DATA_COLLECTIONS.edge, ebody)

    expect(enodes).to.be.an.instanceOf(Array)
    expect(enodes).to.have.lengthOf(2)
    enodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object)
      expect(node.errorNum).to.equal(
        ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code
      )
    })
  })
})
