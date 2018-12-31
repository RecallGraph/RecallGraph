'use strict';

const { expect } = require("chai");
const init = require('../../../helpers/init');
const { createSingle, createMultiple } = require('../../../../lib/handlers/createHandlers');
const { errors: ARANGO_ERRORS } = require('@arangodb');

describe('Create Handlers', () => {
  before(init.setup);

  after(init.teardown);

  it('should create a single vertex', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      k1: 'v1',
    };

    const node = createSingle({ pathParams, body }, { returnNew: true, returnOld: true });

    expect(node).to.be.an.instanceOf(Object);
    expect(node).to.have.property('_id');
    expect(node).to.have.property('_key');
    expect(node).to.have.property('_rev');
    expect(node.new).to.be.an.instanceOf(Object);
    expect(node.new._id).to.equal(node._id);
    expect(node.new._key).to.equal(node._key);
    expect(node.new._rev).to.equal(node._rev);
    expect(node.new.k1).to.equal('v1');
    expect(node.old).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(node.old).to.be.empty;
  });

  it('should create two vertices', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = [
      {
        k1: 'v1',
      },
      {
        k1: 'v1',
      }
    ];

    const nodes = createMultiple({ pathParams, body }, { returnNew: true, returnOld: true });

    expect(nodes).to.be.an.instanceOf(Array);
    expect(nodes).to.have.lengthOf(2);
    nodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node).to.have.property('_id');
      expect(node).to.have.property('_key');
      expect(node).to.have.property('_rev');
      expect(node.new).to.be.an.instanceOf(Object);
      expect(node.new._id).to.equal(node._id);
      expect(node.new._key).to.equal(node._key);
      expect(node.new._rev).to.equal(node._rev);
      expect(node.new.k1).to.equal('v1');
      expect(node.old).to.be.an.instanceOf(Object);
      // noinspection BadExpressionStatementJS
      expect(node.old).to.be.empty;
    });
  });

  it('should create a single edge', () => {
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
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1'
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const enode = createSingle({ pathParams, body: ebody }, { returnNew: true, returnOld: true });

    expect(enode).to.be.an.instanceOf(Object);
    expect(enode).to.have.property('_id');
    expect(enode).to.have.property('_key');
    expect(enode).to.have.property('_rev');
    expect(enode.new).to.be.an.instanceOf(Object);
    expect(enode.new._id).to.equal(enode._id);
    expect(enode.new._key).to.equal(enode._key);
    expect(enode.new._rev).to.equal(enode._rev);
    expect(enode.new._from).to.equal(vnodes[0]._id);
    expect(enode.new._to).to.equal(vnodes[1]._id);
    expect(enode.new.k1).to.equal('v1');
    expect(enode.old).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(enode.old).to.be.empty;
  });

  it('should create two edges', () => {
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
    const vnodes = createMultiple({ pathParams, body: vbody });

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
    const enodes = createMultiple({ pathParams, body: ebody }, { returnNew: true, returnOld: true });

    expect(enodes).to.be.an.instanceOf(Array);
    expect(enodes).to.have.lengthOf(2);
    enodes.forEach(enode => {
      expect(enode).to.be.an.instanceOf(Object);
      expect(enode).to.have.property('_id');
      expect(enode).to.have.property('_key');
      expect(enode).to.have.property('_rev');
      expect(enode.new).to.be.an.instanceOf(Object);
      expect(enode.new._id).to.equal(enode._id);
      expect(enode.new._key).to.equal(enode._key);
      expect(enode.new._rev).to.equal(enode._rev);
      expect(enode.new._from).to.equal(vnodes[0]._id);
      expect(enode.new._to).to.equal(vnodes[1]._id);
      expect(enode.new.k1).to.equal('v1');
      expect(enode.old).to.be.an.instanceOf(Object);
      // noinspection BadExpressionStatementJS
      expect(enode.old).to.be.empty;
    });
  });

  it('should fail when creating a vertex with existing key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      k1: 'v1',
    };

    const node = createSingle({ pathParams, body });

    expect(() => createSingle({
      pathParams,
      body: node
    })).to.throw().with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code);
  });

  it('should fail when creating two vertices with existing key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = [
      {
        k1: 'v1',
      },
      {
        k1: 'v1',
      }
    ];

    let nodes = createMultiple({ pathParams, body });
    nodes = createMultiple({ pathParams, body: nodes });

    expect(nodes).to.be.an.instanceOf(Array);
    nodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code);
      // noinspection BadExpressionStatementJS
      expect(node.errorMessage).to.include(ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.message);
    });
  });

  it('should fail when creating an edge with existing key', () => {
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
    const vnodes = createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1'
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const enode = createSingle({ pathParams, body: ebody }, { returnNew: true }).new;

    expect(() => createSingle({
      pathParams,
      body: enode
    })).to.throw().with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code);
  });

  it('should fail when creating two edges with existing key', () => {
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
    const vnodes = createMultiple({ pathParams, body: vbody });

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
    let enodes = createMultiple({ pathParams, body: ebody }, { returnNew: true });
    enodes = createMultiple({ pathParams, body: enodes.map(node => node.new) });

    expect(enodes).to.be.an.instanceOf(Array);
    enodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code);
      // noinspection BadExpressionStatementJS
      expect(node.errorMessage).to.include(ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.message);
    });
  });
});