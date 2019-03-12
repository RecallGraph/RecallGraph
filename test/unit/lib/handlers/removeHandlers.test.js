'use strict';

const { expect } = require('chai');
const init = require('../../../helpers/init');
const { removeSingle, removeMultiple } = require('../../../../lib/handlers/removeHandlers');
const { createSingle, createMultiple } = require('../../../../lib/handlers/createHandlers');
const { errors: ARANGO_ERRORS } = require('@arangodb');
const { cloneDeep } = require('lodash');

describe('Remove Handlers', () => {
  before(init.setup);

  after(init.teardown);

  it('should fail when removing a vertex where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      k1: 'v1',
      src: `${__filename}:should fail when removing a vertex where ignoreRevs is false and _rev match fails`
    };

    const cnode = createSingle({ pathParams, body });
    cnode._rev = 'mismatched_rev';

    expect(() => removeSingle({ pathParams, body: cnode }, { ignoreRevs: false })).to.throw().with.property(
      'errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code);
  });

  it('should remove a vertex where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      k1: 'v1',
      src: `${__filename}:should remove a vertex where ignoreRevs is false and _rev matches`
    };

    const cnode = createSingle({ pathParams, body }, { returnNew: true }).new;
    const rnode = removeSingle({ pathParams, body: cnode }, { returnNew: true, returnOld: true, ignoreRevs: false });

    expect(rnode).to.be.an.instanceOf(Object);
    expect(rnode._id).to.equal(cnode._id);
    expect(rnode._key).to.equal(cnode._key);
    expect(rnode._rev).to.equal(cnode._rev);
    expect(rnode.old).to.deep.equal(cnode);
    expect(rnode.new).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(rnode.new).to.be.empty;
  });

  it('should remove a single vertex where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      k1: 'v1',
      src: `${__filename}:should remove a single vertex where ignoreRevs is true, irrespective of _rev`
    };

    const cnode = createSingle({ pathParams, body }, { returnNew: true }).new;
    cnode._rev = 'mismatched_rev';

    const rnode = removeSingle({ pathParams, body: cnode }, { returnNew: true, returnOld: true, ignoreRevs: true });

    expect(rnode).to.be.an.instanceOf(Object);
    expect(rnode._id).to.equal(cnode._id);
    expect(rnode._key).to.equal(cnode._key);
    expect(rnode.old).to.be.an.instanceOf(Object);
    expect(rnode.old._id).to.equal(cnode._id);
    expect(rnode.old._key).to.equal(cnode._key);
    expect(rnode.old.k1).to.equal(cnode.k1);
    expect(rnode.new).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(rnode.new).to.be.empty;
  });

  it('should fail when removing two vertices where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when removing two vertices where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when removing two vertices where ignoreRevs is false and _rev match fails`
      }
    ];

    const cnodes = createMultiple({ pathParams, body }, { returnNew: true });

    const rnodes = removeMultiple({
      pathParams, body: cnodes.map(node => {
        node.new._rev = 'mismatched_rev';

        return node.new;
      })
    }, { returnNew: true, ignoreRevs: false });

    expect(rnodes).to.be.an.instanceOf(Array);
    expect(rnodes).to.have.lengthOf(2);
    rnodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code);
      expect(node.errorMessage).to.equal(ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.message);
    });
  });

  it('should remove two vertices where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should remove two vertices where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should remove two vertices where ignoreRevs is false and _rev matches`
      }
    ];

    const cnodes = createMultiple({ pathParams, body }, { returnNew: true });

    const rnodes = removeMultiple({
      pathParams, body: cnodes.map(node => node.new)
    }, { returnNew: true, returnOld: true, ignoreRevs: false });

    expect(rnodes).to.be.an.instanceOf(Array);
    expect(rnodes).to.have.lengthOf(2);
    rnodes.forEach((rnode, idx) => {
      expect(rnode).to.be.an.instanceOf(Object);
      expect(rnode._id).to.equal(cnodes[idx]._id);
      expect(rnode._key).to.equal(cnodes[idx]._key);
      expect(rnode._rev).to.equal(cnodes[idx]._rev);
      expect(rnode.old).to.deep.equal(cnodes[idx].new);
      expect(rnode.new).to.be.an.instanceOf(Object);
      // noinspection BadExpressionStatementJS
      expect(rnode.new).to.be.empty;
    });
  });

  it('should remove two vertices where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:should remove two vertices where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should remove two vertices where ignoreRevs is true, irrespective of _rev`
      }
    ];

    const cnodes = createMultiple({ pathParams, body }, { returnNew: true });

    const rnodes = removeMultiple({
      pathParams, body: cnodes.map(node => {
        const newNode = cloneDeep(node.new);
        newNode._rev = 'mismatched_rev';

        return newNode;
      })
    }, { returnNew: true, returnOld: true, ignoreRevs: true });

    expect(rnodes).to.be.an.instanceOf(Array);
    expect(rnodes).to.have.lengthOf(2);
    rnodes.forEach((rnode, idx) => {
      expect(rnode).to.be.an.instanceOf(Object);
      expect(rnode._id).to.equal(cnodes[idx]._id);
      expect(rnode._key).to.equal(cnodes[idx]._key);
      expect(rnode._rev).to.equal(cnodes[idx]._rev);
      expect(rnode.old).to.deep.equal(cnodes[idx].new);
      expect(rnode.new).to.be.an.instanceOf(Object);
      // noinspection BadExpressionStatementJS
      expect(rnode.new).to.be.empty;
    });
  });

  it('should fail when removing an edge where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when removing an edge where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:sshould fail when removing an edge where ignoreRevs is false and _rev match fails`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should fail when removing an edge where ignoreRevs is false and _rev match fails`
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;

    const ecnode = createSingle({ pathParams, body: ebody }, { returnNew: true }).new;
    ecnode._rev = 'mismatched_rev';

    expect(() => removeSingle({ pathParams, body: ecnode }, { ignoreRevs: false })).to.throw().with.property(
      'errorNum', ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code);
  });

  it('should remove an edge where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should remove an edge where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should remove an edge where ignoreRevs is false and _rev matches`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should remove an edge where ignoreRevs is false and _rev matches`
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;

    const ecnode = createSingle({ pathParams, body: ebody }, { returnNew: true }).new;
    const ernode = removeSingle({ pathParams, body: ecnode },
      { returnNew: true, returnOld: true, ignoreRevs: false });

    expect(ernode).to.be.an.instanceOf(Object);
    expect(ernode._id).to.equal(ecnode._id);
    expect(ernode._key).to.equal(ecnode._key);
    expect(ernode._rev).to.equal(ecnode._rev);
    expect(ernode.old).to.deep.equal(ecnode);
    expect(ernode.new).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(ernode.new).to.be.empty;
  });

  it('should remove an edge where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should remove an edge where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should remove an edge where ignoreRevs is true, irrespective of _rev`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:should remove an edge where ignoreRevs is true, irrespective of _rev`
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const ecnode = createSingle({ pathParams, body: ebody }, { returnNew: true }).new;

    const ecnodeCopy = cloneDeep(ecnode);
    ecnodeCopy._rev = 'mismatched_rev';

    const ernode = removeSingle({ pathParams, body: ecnodeCopy },
      { returnNew: true, returnOld: true, ignoreRevs: true });

    expect(ernode).to.be.an.instanceOf(Object);
    expect(ernode._id).to.equal(ecnode._id);
    expect(ernode._key).to.equal(ecnode._key);
    expect(ernode.old).to.deep.equal(ecnode);
    expect(ernode.new).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(ernode.new).to.be.empty;
  });

  it('should fail when removing two edges where ignoreRevs is false and _rev match fails', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when removing two edges where ignoreRevs is false and _rev match fails`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when removing two edges where ignoreRevs is false and _rev match fails`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should fail when removing two edges where ignoreRevs is false and _rev match fails`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should fail when removing two edges where ignoreRevs is false and _rev match fails`
      }
    ];
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const ecnodes = createMultiple({ pathParams, body: ebody }, { returnNew: true });

    const ernodes = removeMultiple({
      pathParams, body: ecnodes.map(node => {
        node.new._rev = 'mismatched_rev';

        return node.new;
      })
    }, { ignoreRevs: false });

    expect(ernodes).to.be.an.instanceOf(Array);
    expect(ernodes).to.have.lengthOf(2);
    ernodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.code);
      expect(node.errorMessage).to.equal(ARANGO_ERRORS.ERROR_ARANGO_CONFLICT.message);
    });
  });

  it('should remove two edges where ignoreRevs is false and _rev matches', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should remove two edges where ignoreRevs is false and _rev matches`
      },
      {
        k1: 'v1',
        src: `${__filename}:should remove two edges where ignoreRevs is false and _rev matches`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should remove two edges where ignoreRevs is false and _rev matches`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should remove two edges where ignoreRevs is false and _rev matches`
      }
    ];
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const ecnodes = createMultiple({ pathParams, body: ebody }, { returnNew: true });

    const ernodes = removeMultiple({
      pathParams, body: ecnodes.map(node => node.new)
    }, { returnNew: true, returnOld: true, ignoreRevs: false });

    expect(ernodes).to.be.an.instanceOf(Array);
    expect(ernodes).to.have.lengthOf(2);
    ernodes.forEach((ernode, idx) => {
      expect(ernode).to.be.an.instanceOf(Object);
      expect(ernode._id).to.equal(ecnodes[idx]._id);
      expect(ernode._key).to.equal(ecnodes[idx]._key);
      expect(ernode._rev).to.equal(ecnodes[idx]._rev);
      expect(ernode.old).to.deep.equal(ecnodes[idx].new);
      expect(ernode.new).to.be.an.instanceOf(Object);
      // noinspection BadExpressionStatementJS
      expect(ernode.new).to.be.empty;
    });
  });

  it('should remove two edges where ignoreRevs is true, irrespective of _rev', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should remove two edges where ignoreRevs is true, irrespective of _rev`
      },
      {
        k1: 'v1',
        src: `${__filename}:should remove two edges where ignoreRevs is true, irrespective of _rev`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should remove two edges where ignoreRevs is true, irrespective of _rev`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:should remove two edges where ignoreRevs is true, irrespective of _rev`
      }
    ];
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const ecnodes = createMultiple({ pathParams, body: ebody }, { returnNew: true });

    const ernodes = removeMultiple({
      pathParams, body: ecnodes.map(node => {
        const newNode = cloneDeep(node.new);
        newNode._rev = 'mismatched_rev';

        return newNode;
      })
    }, { returnNew: true, returnOld: true });

    expect(ernodes).to.be.an.instanceOf(Array);
    expect(ernodes).to.have.lengthOf(2);
    ernodes.forEach((ernode, idx) => {
      expect(ernode).to.be.an.instanceOf(Object);
      expect(ernode._id).to.equal(ecnodes[idx]._id);
      expect(ernode._key).to.equal(ecnodes[idx]._key);
      expect(ernode._rev).to.equal(ecnodes[idx]._rev);
      expect(ernode.old).to.deep.equal(ecnodes[idx].new);
      expect(ernode.new).to.be.an.instanceOf(Object);
      // noinspection BadExpressionStatementJS
      expect(ernode.new).to.be.empty;
    });
  });

  it('should fail to remove a non-existent vertex', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      _key: 'does-not-exist',
      k1: 'v1',
      src: `${__filename}:should fail to remove a non-existent vertex`
    };

    expect(() => removeSingle({
      pathParams,
      body
    })).to.throw().with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code);
  });

  it('should fail to remove two non-existent vertices.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = [
      {
        _key: 'does-not-exist',
        k1: 'v1',
        src: `${__filename}:should fail to remove two non-existent vertices.`
      },
      {
        _key: 'does-not-exist',
        k1: 'v1',
        src: `${__filename}:should fail to remove two non-existent vertices.`
      }
    ];

    const nodes = removeMultiple({ pathParams, body });

    expect(nodes).to.be.an.instanceOf(Array);
    nodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code);
      // noinspection BadExpressionStatementJS
      expect(node.errorMessage).to.equal(ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.message);
    });
  });

  it('should fail to remove a non-existent edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail to remove a non-existent edge`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail to remove a non-existent edge`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:should fail to remove a non-existent edge`
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;

    expect(() => removeSingle({
      pathParams,
      body: ebody
    })).to.throw().with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code);
  });

  it('should fail when removing two edges with non-existing keys', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:should fail when removing two edges with non-existing keys`
      },
      {
        k1: 'v1',
        src: `${__filename}:should fail when removing two edges with non-existing keys`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:should fail when removing two edges with non-existing keys`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:should fail when removing two edges with non-existing keys`
      }
    ];
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const enodes = removeMultiple({ pathParams, body: ebody });

    expect(enodes).to.be.an.instanceOf(Array);
    enodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code);
      // noinspection BadExpressionStatementJS
      expect(node.errorMessage).to.equal(ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.message);
    });
  });
});