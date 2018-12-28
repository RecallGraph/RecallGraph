'use strict';

const { expect } = require("chai");
const init = require('../../../helpers/init');
const createHandlers = require('../../../../lib/handlers/createHandlers');

describe('Create Handlers', () => {
  before(init.setupTestCollections);

  after(init.teardownTestCollections);

  it('should create a single vertex.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      k1: 'v1',
    };

    const node = createHandlers.createSingle({ pathParams, body });

    expect(node).to.be.an.instanceof(Object);
    expect(node).to.have.property('_id');
    expect(node).to.have.property('_key');
    expect(node).to.have.property('_rev');
    expect(node.k1).to.equal('v1');
  });

  it('should create two vertices.', () => {
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

    const nodes = createHandlers.createMultiple({ pathParams, body });

    expect(nodes).to.be.an.instanceof(Array);
    expect(nodes).to.have.lengthOf(2);
    nodes.forEach(node => {
      expect(node).to.be.an.instanceof(Object);
      expect(node).to.have.property('_id');
      expect(node).to.have.property('_key');
      expect(node).to.have.property('_rev');
      expect(node.k1).to.equal('v1');
    });
  });

  it('should create a single edge.', () => {
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
    const enode = createHandlers.createSingle({ pathParams, body: ebody });

    expect(enode).to.be.an.instanceof(Object);
    expect(enode).to.have.property('_id');
    expect(enode).to.have.property('_key');
    expect(enode).to.have.property('_rev');
    expect(enode._from).to.equal(vnodes[0]._id);
    expect(enode._to).to.equal(vnodes[1]._id);
    expect(enode.k1).to.equal('v1');
  });

  it('should create two edges.', () => {
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
    const enodes = createHandlers.createMultiple({ pathParams, body: ebody });

    expect(enodes).to.be.an.instanceof(Array);
    expect(enodes).to.have.lengthOf(2);
    enodes.forEach(enode => {
      expect(enode).to.be.an.instanceof(Object);
      expect(enode).to.have.property('_id');
      expect(enode).to.have.property('_key');
      expect(enode).to.have.property('_rev');
      expect(enode._from).to.equal(vnodes[0]._id);
      expect(enode._to).to.equal(vnodes[1]._id);
      expect(enode.k1).to.equal('v1');
    });
  });
});