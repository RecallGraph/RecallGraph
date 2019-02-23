'use strict';

const { expect } = require("chai");
const init = require('../../../helpers/init');
const { removeSingle, removeMultiple } = require('../../../../lib/handlers/removeHandlers');
const { createSingle, createMultiple } = require('../../../../lib/handlers/createHandlers');
const { errors: ARANGO_ERRORS } = require('@arangodb');

describe('Remove Handlers', () => {
  before(init.setup);

  after(init.teardown);

  it('should remove a single vertex.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      k1: 'v1',
      src: `${__filename}:${__line}`
    };

    const cnode = createSingle({ pathParams, body }, { returnNew: true }).new;

    const rnode = removeSingle({ pathParams, body: cnode }, { returnNew: true, returnOld: true });

    expect(rnode).to.be.an.instanceOf(Object);
    expect(rnode._id).to.equal(cnode._id);
    expect(rnode._key).to.equal(cnode._key);
    expect(rnode._rev).to.equal(cnode._rev);
    expect(rnode.old).to.deep.equal(cnode);
    expect(rnode.new).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(rnode.new).to.be.empty;
  });

  it('should remove two vertices.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = [
      {
        k1: 'v1',
        src: `${__filename}:${__line}`
      },
      {
        k1: 'v1',
        src: `${__filename}:${__line}`
      }
    ];

    const cnodes = createMultiple({ pathParams, body }, { returnNew: true });

    const rnodes = removeMultiple({
      pathParams, body: cnodes.map(node => node.new)
    }, { returnNew: true, returnOld: true });

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

  it('should remove a single edge.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:${__line}`
      },
      {
        k1: 'v1',
        src: `${__filename}:${__line}`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      src: `${__filename}:${__line}`
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const ecnode = createSingle({ pathParams, body: ebody }, { returnNew: true }).new;

    const ernode = removeSingle({ pathParams, body: ecnode }, { returnNew: true, returnOld: true });

    expect(ernode).to.be.an.instanceOf(Object);
    expect(ernode._id).to.equal(ecnode._id);
    expect(ernode._key).to.equal(ecnode._key);
    expect(ernode._rev).to.equal(ecnode._rev);
    expect(ernode.old).to.deep.equal(ecnode);
    expect(ernode.new).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(ernode.new).to.be.empty;
  });

  it('should remove two edges.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
        src: `${__filename}:${__line}`
      },
      {
        k1: 'v1',
        src: `${__filename}:${__line}`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:${__line}`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        src: `${__filename}:${__line}`
      }
    ];
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const ecnodes = createMultiple({ pathParams, body: ebody }, { returnNew: true });

    const ernodes = removeMultiple({
      pathParams, body: ecnodes.map(node => node.new)
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
      src: `${__filename}:${__line}`
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
        src: `${__filename}:${__line}`
      },
      {
        _key: 'does-not-exist',
        k1: 'v1',
        src: `${__filename}:${__line}`
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
        src: `${__filename}:${__line}`
      },
      {
        k1: 'v1',
        src: `${__filename}:${__line}`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      _key: 'does-not-exist',
      src: `${__filename}:${__line}`
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
        src: `${__filename}:${__line}`
      },
      {
        k1: 'v1',
        src: `${__filename}:${__line}`
      }
    ];
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:${__line}`
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        _key: 'does-not-exist',
        src: `${__filename}:${__line}`
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