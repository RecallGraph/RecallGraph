'use strict';

const { expect } = require("chai");
const init = require('../../../helpers/init');
const createHandlers = require('../../../../lib/handlers/createHandlers');
const ARANGO_ERRORS = require('@arangodb').errors;

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

    const node = createHandlers.createSingle({ pathParams, body }, { returnNew: true }).new;

    expect(node).to.be.an.instanceOf(Object);
    expect(node).to.have.property('_id');
    expect(node).to.have.property('_key');
    expect(node).to.have.property('_rev');
    expect(node.k1).to.equal('v1');
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

    const nodes = createHandlers.createMultiple({ pathParams, body }, { returnNew: true });

    expect(nodes).to.be.an.instanceOf(Array);
    expect(nodes).to.have.lengthOf(2);
    nodes.map(node => node.new).forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node).to.have.property('_id');
      expect(node).to.have.property('_key');
      expect(node).to.have.property('_rev');
      expect(node.k1).to.equal('v1');
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
    const vnodes = createHandlers.createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1'
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const enode = createHandlers.createSingle({ pathParams, body: ebody }, { returnNew: true }).new;

    expect(enode).to.be.an.instanceOf(Object);
    expect(enode).to.have.property('_id');
    expect(enode).to.have.property('_key');
    expect(enode).to.have.property('_rev');
    expect(enode._from).to.equal(vnodes[0]._id);
    expect(enode._to).to.equal(vnodes[1]._id);
    expect(enode.k1).to.equal('v1');
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
    const enodes = createHandlers.createMultiple({ pathParams, body: ebody }, { returnNew: true });

    expect(enodes).to.be.an.instanceOf(Array);
    expect(enodes).to.have.lengthOf(2);
    enodes.map(node => node.new).forEach(enode => {
      expect(enode).to.be.an.instanceOf(Object);
      expect(enode).to.have.property('_id');
      expect(enode).to.have.property('_key');
      expect(enode).to.have.property('_rev');
      expect(enode._from).to.equal(vnodes[0]._id);
      expect(enode._to).to.equal(vnodes[1]._id);
      expect(enode.k1).to.equal('v1');
    });
  });

  it('should fail when creating a vertex with existing key', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      k1: 'v1',
    };

    const node = createHandlers.createSingle({ pathParams, body });

    expect(() => createHandlers.createSingle({
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

    let nodes = createHandlers.createMultiple({ pathParams, body });
    nodes = createHandlers.createMultiple({ pathParams, body: nodes });

    expect(nodes).to.be.an.instanceOf(Array);
    nodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code);
      // noinspection BadExpressionStatementJS
      expect(node.errorMessage).to.be.not.empty;
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
    const vnodes = createHandlers.createMultiple({ pathParams, body: vbody });

    const ebody = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1'
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const enode = createHandlers.createSingle({ pathParams, body: ebody }, { returnNew: true }).new;

    expect(() => createHandlers.createSingle({
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
    let enodes = createHandlers.createMultiple({ pathParams, body: ebody }, { returnNew: true });
    enodes = createHandlers.createMultiple({ pathParams, body: enodes.map(node => node.new) });

    expect(enodes).to.be.an.instanceOf(Array);
    enodes.forEach(node => {
      expect(node).to.be.an.instanceOf(Object);
      expect(node.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code);
      // noinspection BadExpressionStatementJS
      expect(node.errorMessage).to.be.not.empty;
    });
  });
});