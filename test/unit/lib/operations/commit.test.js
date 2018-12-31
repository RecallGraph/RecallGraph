'use strict';

const { expect } = require("chai");
const init = require('../../../helpers/init');
const DB_OPS = require('../../../../lib/helpers').DB_OPS;
const commit = require('../../../../lib/operations/commit');
const createHandlers = require('../../../../lib/handlers/createHandlers');

describe('Commit', () => {
  before(init.setup);

  after(init.teardown);

  it('should create a vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true }).new;

    expect(cnode).to.be.an.instanceOf(Object);
    expect(cnode).to.have.property('_id');
    expect(cnode).to.have.property('_key');
    expect(cnode).to.have.property('_rev');
    expect(cnode.k1).to.equal('v1');
  });

  it('should fail when creating a vertex with an existing key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };

    const cnode = commit(collName, node, DB_OPS.INSERT);

    expect(() => commit(collName, cnode, DB_OPS.INSERT)).to.throw();
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

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true }).new;

    expect(cnode).to.be.an.instanceOf(Object);
    expect(cnode).to.have.property('_id');
    expect(cnode).to.have.property('_key');
    expect(cnode).to.have.property('_rev');
    expect(cnode._from).to.equal(vnodes[0]._id);
    expect(cnode._to).to.equal(vnodes[1]._id);
    expect(cnode.k1).to.equal('v1');
  });

  it('should fail when creating an edge with an existing key', () => {
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

    expect(() => commit(collName, cnode, DB_OPS.INSERT)).to.throw();
  });

  it('should replace a vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };

    const cnode = commit(collName, node, DB_OPS.INSERT);
    cnode.k1 = 'v2';

    const rnode = commit(collName, cnode, DB_OPS.REPLACE, { returnNew: true }).new;

    expect(rnode).to.be.an.instanceOf(Object);
    expect(rnode._id).to.equal(cnode._id);
    expect(rnode._key).to.equal(cnode._key);
    expect(rnode.k1).to.equal('v2');
    expect(rnode._rev).to.not.equal(cnode._rev);
  });

  it('should fail when replacing a vertex with a non-existent key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1',
      _key: 'does-not-exist'
    };

    expect(() => commit(collName, node, DB_OPS.REPLACE)).to.throw();
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

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true }).new;
    cnode.k1 = 'v2';

    const rnode = commit(collName, cnode, DB_OPS.REPLACE, { returnNew: true }).new;

    expect(rnode).to.be.an.instanceOf(Object);
    expect(rnode._id).to.equal(cnode._id);
    expect(rnode._key).to.equal(cnode._key);
    expect(rnode._from).to.equal(vnodes[0]._id);
    expect(rnode._to).to.equal(vnodes[1]._id);
    expect(rnode.k1).to.equal('v2');
    expect(rnode._rev).to.not.equal(cnode._rev);
  });

  it('should fail when replacing an edge with a non-existent key', () => {
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
      k1: 'v1',
      _key: 'does-not-exist'
    };
    const collName = init.TEST_DATA_COLLECTIONS.edge;

    expect(() => commit(collName, node, DB_OPS.REPLACE)).to.throw();
  });

  it('should delete a vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };
    const cnode = commit(collName, node, DB_OPS.INSERT);

    const dnode = commit(collName, cnode, DB_OPS.REMOVE);

    expect(dnode).to.be.an.instanceOf(Object);
    Object.keys(dnode).forEach(key => expect(dnode[key]).to.equal(cnode[key]));
  });

  // it('should fail when deleting a vertex with a non-existent key', () => {
  //   const collName = init.TEST_DATA_COLLECTIONS.vertex;
  //   const node = {
  //     k1: 'v1',
  //     _key: 'does-not-exist'
  //   };
  //
  //   expect(() => commit(collName, node, DB_OPS.REPLACE)).to.throw();
  // });
  //
  // it('should delete an edge', () => {
  //   const pathParams = {
  //     collection: init.TEST_DATA_COLLECTIONS.vertex
  //   };
  //   const vbody = [
  //     {
  //       k1: 'v1',
  //     },
  //     {
  //       k1: 'v1',
  //     }
  //   ];
  //   const vnodes = createHandlers.createMultiple({ pathParams, body: vbody });
  //
  //   const node = {
  //     _from: vnodes[0]._id,
  //     _to: vnodes[1]._id,
  //     k1: 'v1'
  //   };
  //   const collName = init.TEST_DATA_COLLECTIONS.edge;
  //
  //   const cnode = commit(collName, node, DB_OPS.INSERT);
  //   cnode.k1 = 'v2';
  //
  //   const rnode = commit(collName, cnode, DB_OPS.REPLACE);
  //
  //   expect(rnode).to.be.an.instanceOf(Object);
  //   expect(rnode._id).to.equal(cnode._id);
  //   expect(rnode._key).to.equal(cnode._key);
  //   expect(rnode._from).to.equal(vnodes[0]._id);
  //   expect(rnode._to).to.equal(vnodes[1]._id);
  //   expect(rnode.k1).to.equal('v2');
  //   expect(rnode._rev).to.not.equal(cnode._rev);
  // });
  //
  // it('should fail when deleting an edge with a non-existent key', () => {
  //   const pathParams = {
  //     collection: init.TEST_DATA_COLLECTIONS.vertex
  //   };
  //   const vbody = [
  //     {
  //       k1: 'v1',
  //     },
  //     {
  //       k1: 'v1',
  //     }
  //   ];
  //   const vnodes = createHandlers.createMultiple({ pathParams, body: vbody });
  //
  //   const node = {
  //     _from: vnodes[0]._id,
  //     _to: vnodes[1]._id,
  //     k1: 'v1',
  //     _key: 'does-not-exist'
  //   };
  //   const collName = init.TEST_DATA_COLLECTIONS.edge;
  //
  //   expect(() => commit(collName, node, DB_OPS.REPLACE)).to.throw();
  // });
});