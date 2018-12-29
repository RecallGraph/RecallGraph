'use strict';

const { expect } = require("chai");
const init = require('../../../helpers/init');
const replaceHandlers = require('../../../../lib/handlers/replaceHandlers');
const createHandlers = require('../../../../lib/handlers/createHandlers');
const ARANGO_ERRORS = require('@arangodb').errors;

describe('Replace Handlers', () => {
  before(init.setup);

  after(init.teardown);

  it('should replace a single vertex.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      k1: 'v1'
    };

    const cnode = createHandlers.createSingle({ pathParams, body });

    cnode.k1 = 'v2';
    const rnode = replaceHandlers.replaceSingle({ pathParams, body: cnode });

    expect(rnode).to.be.an.instanceOf(Object);
    expect(rnode).to.have.property('_id');
    expect(rnode).to.have.property('_key');
    expect(rnode.k1).to.equal('v2');
    expect(rnode._rev).to.not.equal(cnode._rev);
  });

  it('should replace two vertices.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = [
      {
        k1: 'v1'
      },
      {
        k1: 'v1'
      }
    ];

    const cnodes = createHandlers.createMultiple({ pathParams, body });

    cnodes.forEach(node => node.k1 = 'v2');
    const rnodes = replaceHandlers.replaceMultiple({ pathParams, body: cnodes });

    expect(rnodes).to.be.an.instanceOf(Array);
    expect(rnodes).to.have.lengthOf(2);
    rnodes.forEach((node, idx) => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node).to.have.property('_id');
      expect(node).to.have.property('_key');
      expect(node.k1).to.equal('v2');
      expect(node._rev).to.not.equal(cnodes[idx]._rev);
    });
  });

  it('should replace a single edge.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1'
      },
      {
        k1: 'v1'
      }
    ];
    const vnodes = createHandlers.createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1'
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const ecnode = createHandlers.createSingle({ pathParams, body: ebody });

    ecnode.k1 = 'v2';
    const ernode = replaceHandlers.replaceSingle({ pathParams, body: ecnode });

    expect(ernode).to.be.an.instanceOf(Object);
    expect(ernode).to.have.property('_id');
    expect(ernode).to.have.property('_key');
    expect(ernode._from).to.equal(vnodes[0]._id);
    expect(ernode._to).to.equal(vnodes[1]._id);
    expect(ernode.k1).to.equal('v2');
    expect(ernode._rev).to.not.equal(ecnode._rev);
  });

  it('should replace two edges.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1'
      },
      {
        k1: 'v1'
      }
    ];
    const vnodes = createHandlers.createMultiple({ pathParams, body: vbody });

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1'
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1'
      }
    ];
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const ecnodes = createHandlers.createMultiple({ pathParams, body: ebody });

    ecnodes.forEach(node => node.k1 = 'v2');
    const ernodes = replaceHandlers.replaceMultiple({ pathParams, body: ecnodes });

    expect(ernodes).to.be.an.instanceOf(Array);
    expect(ernodes).to.have.lengthOf(2);
    ernodes.forEach((ernode, idx) => {
      expect(ernode).to.be.an.instanceOf(Object);
      expect(ernode).to.have.property('_id');
      expect(ernode).to.have.property('_key');
      expect(ernode._from).to.equal(vnodes[0]._id);
      expect(ernode._to).to.equal(vnodes[1]._id);
      expect(ernode.k1).to.equal('v2');
      expect(ernode._rev).to.not.equal(ecnodes[idx]._rev);
    });
  });

  it('should fail to replace a non-existent vertex', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      _key: 'does-not-exist',
      k1: 'v1'
    };

    expect(() => replaceHandlers.replaceSingle({ pathParams, body })).to.throw();
  });

  it('should fail to replace two non-existent vertices.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = [
      {
        _key: 'does-not-exist',
        k1: 'v1'
      },
      {
        _key: 'does-not-exist',
        k1: 'v1'
      }
    ];

    const nodes = replaceHandlers.replaceMultiple({ pathParams, body });

    expect(nodes).to.be.an.instanceOf(Array);
    nodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code);
      // noinspection BadExpressionStatementJS
      expect(node).to.be.not.empty;
    });
  });

  it('should fail to replace a non-existent edge', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
      },
      {
        k1: 'v1',
      }
    ];
    const vnodes = createHandlers.createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1',
      _key: 'does-not-exist'
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;

    expect(() => replaceHandlers.replaceSingle({ pathParams, body: ebody })).to.throw();
  });

  it('should fail when replacing two edges with non-existing keys', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const vbody = [
      {
        k1: 'v1',
      },
      {
        k1: 'v1',
      }
    ];
    const vnodes = createHandlers.createMultiple({ pathParams, body: vbody });

    const ebody = [
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        _key: 'does-not-exist'
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id,
        k1: 'v1',
        _key: 'does-not-exist'
      }
    ];
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const enodes = replaceHandlers.replaceMultiple({ pathParams, body: ebody });

    expect(enodes).to.be.an.instanceOf(Array);
    enodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code);
      // noinspection BadExpressionStatementJS
      expect(node).to.be.not.empty;
    });
  });
});