'use strict';

const { expect } = require("chai");
const init = require('../../../helpers/init');
const DB_OPS = require('../../../../lib/helpers').DB_OPS;
const commit = require('../../../../lib/operations/commit');
const createHandlers = require('../../../../lib/handlers/createHandlers');

describe('Commit', () => {
  before(init.setupTestCollections);

  after(init.teardownTestCollections);

  it('should create a vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };

    const cnode = commit(collName, node, DB_OPS.INSERT);

    expect(cnode).to.be.an.instanceof(Object);
    expect(cnode).to.have.property('_id');
    expect(cnode).to.have.property('_key');
    expect(cnode).to.have.property('_rev');
    expect(cnode.k1).to.equal('v1');
  });

  it('should create an edge', () => {
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

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1'
    };
    const collName = init.TEST_DATA_COLLECTIONS.edge;

    const cnode = commit(collName, node, DB_OPS.INSERT);

    expect(cnode).to.be.an.instanceof(Object);
    expect(cnode).to.have.property('_id');
    expect(cnode).to.have.property('_key');
    expect(cnode).to.have.property('_rev');
    expect(cnode._from).to.equal(vnodes[0]._id);
    expect(cnode._to).to.equal(vnodes[1]._id);
    expect(cnode.k1).to.equal('v1');
  });

  it('should replace a vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };

    const cnode = commit(collName, node, DB_OPS.INSERT);
    cnode.k1 = 'v2';

    const rnode = commit(collName, cnode, DB_OPS.REPLACE);

    expect(rnode).to.be.an.instanceof(Object);
    expect(rnode).to.have.property('_id');
    expect(rnode).to.have.property('_key');
    expect(rnode.k1).to.equal('v2');
    expect(rnode._rev).to.not.equal(cnode._rev);
  });

  it('should replace an edge', () => {
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

    const node = {
      _from: vnodes[0]._id,
      _to: vnodes[1]._id,
      k1: 'v1'
    };
    const collName = init.TEST_DATA_COLLECTIONS.edge;

    const cnode = commit(collName, node, DB_OPS.INSERT);
    cnode.k1 = 'v2';

    const rnode = commit(collName, cnode, DB_OPS.REPLACE);

    expect(rnode).to.be.an.instanceof(Object);
    expect(rnode).to.have.property('_id');
    expect(rnode).to.have.property('_key');
    expect(rnode._from).to.equal(vnodes[0]._id);
    expect(rnode._to).to.equal(vnodes[1]._id);
    expect(rnode.k1).to.equal('v2');
    expect(rnode._rev).to.not.equal(cnode._rev);
  });
});