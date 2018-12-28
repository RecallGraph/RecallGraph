'use strict';

const { expect } = require("chai");
const init = require('../../../helpers/init');
const replaceHandlers = require('../../../../lib/handlers/replaceHandlers');
const createHandlers = require('../../../../lib/handlers/createHandlers');

describe('Replace Handlers', () => {
  before(init.setupTestCollections);

  after(init.teardownTestCollections);

  it('should replace a single vertex.', () => {
    const pathParams = {
      collection: init.TEST_DATA_COLLECTIONS.vertex
    };
    const body = {
      k1: 'v1',
    };

    const cnode = createHandlers.createSingle({ pathParams, body });

    cnode.k1 = 'v2';
    const rnode = replaceHandlers.replaceSingle({ pathParams, body: cnode });

    expect(rnode).to.be.an.instanceof(Object);
    expect(rnode).to.have.property('_id');
    expect(rnode).to.have.property('_key');
    expect(rnode).to.have.property('_rev');
    expect(rnode).to.have.property('k1');
    expect(rnode.k1).to.equal('v2');
  });

  it('should replace two vertices.', () => {
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

    const cnodes = createHandlers.createMultiple({ pathParams, body });

    cnodes.forEach(node => node.k1 = 'v2');
    const rnodes = replaceHandlers.replaceMultiple({ pathParams, body: cnodes });

    expect(rnodes).to.be.an.instanceof(Array);
    expect(rnodes).to.have.lengthOf(2);
    rnodes.forEach(node => {
      expect(node).to.be.an.instanceof(Object);
      expect(node).to.have.property('_id');
      expect(node).to.have.property('_key');
      expect(node).to.have.property('_rev');
      expect(node).to.have.property('k1');
      expect(node.k1).to.equal('v2');
    });
  });

  it('should replace a single edge.', () => {
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
      _to: vnodes[1]._id
    };
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const ecnode = createHandlers.createSingle({ pathParams, body: ebody });

    ecnode.k1 = 'v1';
    const ernode = replaceHandlers.replaceSingle({ pathParams, body: ecnode });

    expect(ernode).to.be.an.instanceof(Object);
    expect(ernode).to.have.property('_id');
    expect(ernode).to.have.property('_key');
    expect(ernode).to.have.property('_rev');
    expect(ernode).to.have.property('_from');
    expect(ernode).to.have.property('_to');
    expect(ernode._from).to.equal(vnodes[0]._id);
    expect(ernode._to).to.equal(vnodes[1]._id);
    expect(ernode).to.have.property('k1');
    expect(ernode.k1).to.equal('v1');
  });

  it('should replace two edges.', () => {
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
        _to: vnodes[1]._id
      },
      {
        _from: vnodes[0]._id,
        _to: vnodes[1]._id
      }
    ];
    pathParams.collection = init.TEST_DATA_COLLECTIONS.edge;
    const ecnodes = createHandlers.createMultiple({ pathParams, body: ebody });

    ecnodes.forEach(node => node.k1 = 'v1');
    const ernodes = replaceHandlers.replaceMultiple({ pathParams, body: ecnodes });

    expect(ernodes).to.be.an.instanceof(Array);
    expect(ernodes).to.have.lengthOf(2);
    ernodes.forEach(ernode => {
      expect(ernode).to.be.an.instanceof(Object);
      expect(ernode).to.have.property('_id');
      expect(ernode).to.have.property('_key');
      expect(ernode).to.have.property('_rev');
      expect(ernode).to.have.property('_from');
      expect(ernode).to.have.property('_to');
      expect(ernode._from).to.equal(vnodes[0]._id);
      expect(ernode._to).to.equal(vnodes[1]._id);
      expect(ernode).to.have.property('k1');
      expect(ernode.k1).to.equal('v1');
    });
  });
});