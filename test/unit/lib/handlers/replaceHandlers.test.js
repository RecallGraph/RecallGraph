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

    const cnode = createHandlers.createSingle({ pathParams, body }, { returnNew: true }).new;

    cnode.k1 = 'v2';
    const rnode = replaceHandlers.replaceSingle({ pathParams, body: cnode }, { returnNew: true }).new;

    expect(rnode).to.be.an.instanceOf(Object);
    expect(rnode._id).to.equal(cnode._id);
    expect(rnode._key).to.equal(cnode._key);
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

    const cnodes = createHandlers.createMultiple({ pathParams, body }, { returnNew: true });

    const rnodes = replaceHandlers.replaceMultiple({
      pathParams, body: cnodes.map(node => {
        node.new.k1 = 'v2';

        return node.new;
      })
    }, { returnNew: true });

    expect(rnodes).to.be.an.instanceOf(Array);
    expect(rnodes).to.have.lengthOf(2);
    rnodes.map(node => node.new).forEach((node, idx) => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node._id).to.equal(cnodes[idx]._id);
      expect(node._key).to.equal(cnodes[idx]._key);
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
    const ecnode = createHandlers.createSingle({ pathParams, body: ebody }, { returnNew: true }).new;

    ecnode.k1 = 'v2';
    const ernode = replaceHandlers.replaceSingle({ pathParams, body: ecnode }, { returnNew: true }).new;

    expect(ernode).to.be.an.instanceOf(Object);
    expect(ernode._id).to.equal(ecnode._id);
    expect(ernode._key).to.equal(ecnode._key);
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
    const ecnodes = createHandlers.createMultiple({ pathParams, body: ebody }, { returnNew: true });

    const ernodes = replaceHandlers.replaceMultiple({
      pathParams, body: ecnodes.map(node => {
        node.new.k1 = 'v2';

        return node.new;
      })
    }, { returnNew: true });

    expect(ernodes).to.be.an.instanceOf(Array);
    expect(ernodes).to.have.lengthOf(2);
    ernodes.map(node => node.new).forEach((ernode, idx) => {
      expect(ernode).to.be.an.instanceOf(Object);
      expect(ernode._id).to.equal(ecnodes[idx]._id);
      expect(ernode._key).to.equal(ecnodes[idx]._key);
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
      expect(node.errorMessage).to.be.not.empty;
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
      expect(node.errorMessage).to.be.not.empty;
    });
  });
});