'use strict';

const { expect } = require("chai");
const init = require('../../../helpers/init');
const DB_OPS = require('../../../../lib/helpers').DB_OPS;
const commit = require('../../../../lib/operations/commit');
const createHandlers = require('../../../../lib/handlers/createHandlers');
const ARANGO_ERRORS = require('@arangodb').errors;

describe('Commit', () => {
  before(init.setup);

  after(init.teardown);

  it('should create a vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true, returnOld: true });

    expect(cnode).to.be.an.instanceOf(Object);
    expect(cnode).to.have.property('_id');
    expect(cnode).to.have.property('_key');
    expect(cnode).to.have.property('_rev');
    expect(cnode.new).to.be.an.instanceOf(Object);
    expect(cnode.new._id).to.equal(cnode._id);
    expect(cnode.new._key).to.equal(cnode._key);
    expect(cnode.new._rev).to.equal(cnode._rev);
    expect(cnode.new.k1).to.equal('v1');
    expect(cnode.old).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(cnode.old).to.be.empty;
  });

  it('should fail when creating a vertex with an existing key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };

    const cnode = commit(collName, node, DB_OPS.INSERT);

    expect(() => commit(collName, cnode, DB_OPS.INSERT)).to.throw().with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code);
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

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true, returnOld: true });

    expect(cnode).to.be.an.instanceOf(Object);
    expect(cnode).to.have.property('_id');
    expect(cnode).to.have.property('_key');
    expect(cnode).to.have.property('_rev');
    expect(cnode.new).to.be.an.instanceOf(Object);
    expect(cnode.new._id).to.equal(cnode._id);
    expect(cnode.new._key).to.equal(cnode._key);
    expect(cnode.new._rev).to.equal(cnode._rev);
    expect(cnode.new._from).to.equal(vnodes[0]._id);
    expect(cnode.new._to).to.equal(vnodes[1]._id);
    expect(cnode.new.k1).to.equal('v1');
    expect(cnode.old).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(cnode.old).to.be.empty;
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

    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true }).new;

    expect(() => commit(collName, cnode, DB_OPS.INSERT)).to.throw().with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code);
  });

  it('should replace a vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };

    const cnode = commit(collName, node, DB_OPS.INSERT);
    cnode.k1 = 'v2';

    const rnode = commit(collName, cnode, DB_OPS.REPLACE, { returnNew: true, returnOld: true });

    expect(rnode).to.be.an.instanceOf(Object);
    expect(rnode._id).to.equal(cnode._id);
    expect(rnode._key).to.equal(cnode._key);
    expect(rnode._rev).to.not.equal(cnode._rev);
    expect(rnode.new).to.be.an.instanceOf(Object);
    expect(rnode.new._id).to.equal(rnode._id);
    expect(rnode.new._key).to.equal(rnode._key);
    expect(rnode.new._rev).to.equal(rnode._rev);
    expect(rnode.new.k1).to.equal('v2');
    expect(rnode.old).to.be.an.instanceOf(Object);
    expect(rnode.old._id).to.equal(rnode._id);
    expect(rnode.old._key).to.equal(rnode._key);
    expect(rnode.old._rev).to.equal(cnode._rev);
    expect(rnode.old.k1).to.equal('v1');
  });

  it('should fail when replacing a vertex with a non-existent key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1',
      _key: 'does-not-exist'
    };

    expect(() => commit(collName, node, DB_OPS.REPLACE)).to.throw().with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code);
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

    const rnode = commit(collName, cnode, DB_OPS.REPLACE, { returnNew: true, returnOld: true });

    expect(rnode).to.be.an.instanceOf(Object);
    expect(rnode._id).to.equal(cnode._id);
    expect(rnode._key).to.equal(cnode._key);
    expect(rnode._rev).to.not.equal(cnode._rev);
    expect(rnode.new).to.be.an.instanceOf(Object);
    expect(rnode.new._id).to.equal(rnode._id);
    expect(rnode.new._key).to.equal(rnode._key);
    expect(rnode.new._rev).to.equal(rnode._rev);
    expect(rnode.new._from).to.equal(vnodes[0]._id);
    expect(rnode.new._to).to.equal(vnodes[1]._id);
    expect(rnode.new.k1).to.equal('v2');
    expect(rnode.old).to.be.an.instanceOf(Object);
    expect(rnode.old._id).to.equal(rnode._id);
    expect(rnode.old._key).to.equal(rnode._key);
    expect(rnode.old._rev).to.equal(cnode._rev);
    expect(rnode.old._from).to.equal(rnode.new._from);
    expect(rnode.old._to).to.equal(rnode.new._to);
    expect(rnode.old.k1).to.equal('v1');
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

    expect(() => commit(collName, node, DB_OPS.REPLACE)).to.throw().with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code);
  });

  it('should delete a vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };
    const cnode = commit(collName, node, DB_OPS.INSERT, { returnNew: true }).new;

    const dnode = commit(collName, cnode, DB_OPS.REMOVE, { returnNew: true, returnOld: true });

    expect(dnode).to.be.an.instanceOf(Object);
    expect(dnode._id).to.equal(cnode._id);
    expect(dnode._key).to.equal(cnode._key);
    expect(dnode._rev).to.equal(cnode._rev);
    expect(dnode.old).to.deep.equal(cnode);
    expect(dnode.new).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(dnode.new).to.be.empty;
  });

  it('should fail when deleting a vertex with a non-existent key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1',
      _key: 'does-not-exist'
    };

    expect(() => commit(collName, node, DB_OPS.REMOVE)).to.throw().with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code);
  });

  it('should delete an edge', () => {
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

    const dnode = commit(collName, cnode, DB_OPS.REMOVE, { returnNew: true, returnOld: true });

    expect(dnode).to.be.an.instanceOf(Object);
    expect(dnode._id).to.equal(cnode._id);
    expect(dnode._key).to.equal(cnode._key);
    expect(dnode._rev).to.equal(cnode._rev);
    expect(dnode.old).to.deep.equal(cnode);
    expect(dnode.new).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(dnode.new).to.be.empty;
  });

  it('should fail when deleting an edge with a non-existent key', () => {
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

    expect(() => commit(collName, node, DB_OPS.REPLACE)).to.throw().with.property('errorNum', ARANGO_ERRORS.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code);
  });
});