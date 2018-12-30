'use strict';

const { expect } = require("chai");
const init = require('../../../../helpers/init');
const request = require("@arangodb/request");
const { baseUrl } = module.context;
const ARANGO_ERRORS = require('@arangodb').errors;

describe('Routes - create', () => {
  before(init.setup);

  after(init.teardown);

  it('should create a single vertex', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const node = {
      k1: 'v1'
    };

    const response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    });

    expect(response).to.be.an.instanceOf(Object);
    expect(response.statusCode).to.equal(200);

    const resBody = JSON.parse(response.body);
    expect(resBody).to.be.an.instanceOf(Object);
    expect(resBody).to.have.property('_id');
    expect(resBody).to.have.property('_key');
    expect(resBody).to.have.property('_rev');
    expect(resBody.k1).to.equal('v1');
  });

  it('should create two vertices', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const nodes = [
      {
        k1: 'v1'
      },
      {
        k1: 'v1'
      }
    ];

    const response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    });

    expect(response).to.be.an.instanceOf(Object);
    expect(response.statusCode).to.equal(200);

    const resBody = JSON.parse(response.body);
    expect(resBody).to.be.an.instanceOf(Array);
    resBody.forEach(resNode => {
      expect(resNode).to.be.an.instanceOf(Object);
      expect(resNode).to.have.property('_id');
      expect(resNode).to.have.property('_key');
      expect(resNode).to.have.property('_rev');
      expect(resNode.k1).to.equal('v1');
    });
  });

  it('should create a single edge', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex;
    let vnodes = [{}, {}];
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    });
    vnodes = JSON.parse(vResponse.body);

    const eCollName = init.TEST_DATA_COLLECTIONS.edge;
    const enode = {
      k1: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id
    };

    const response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    });

    expect(response).to.be.an.instanceOf(Object);
    expect(response.statusCode).to.equal(200);

    const resBody = JSON.parse(response.body);
    expect(resBody).to.be.an.instanceOf(Object);
    expect(resBody).to.have.property('_id');
    expect(resBody).to.have.property('_key');
    expect(resBody).to.have.property('_rev');
    expect(resBody.k1).to.equal('v1');
    expect(resBody._from).to.equal(vnodes[0]._id);
    expect(resBody._to).to.equal(vnodes[1]._id);
  });

  it('should create two edges', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex;
    let vnodes = [{}, {}];
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    });
    vnodes = JSON.parse(vResponse.body);

    const eCollName = init.TEST_DATA_COLLECTIONS.edge;
    const enodes = [
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id
      },
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id
      }
    ];

    const response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    });

    expect(response).to.be.an.instanceOf(Object);
    expect(response.statusCode).to.equal(200);

    const resBody = JSON.parse(response.body);
    expect(resBody).to.be.an.instanceOf(Array);
    resBody.forEach(resNode => {
      expect(resNode).to.be.an.instanceOf(Object);
      expect(resNode).to.have.property('_id');
      expect(resNode).to.have.property('_key');
      expect(resNode).to.have.property('_rev');
      expect(resNode.k1).to.equal('v1');
      expect(resNode._from).to.equal(vnodes[0]._id);
      expect(resNode._to).to.equal(vnodes[1]._id);
    });
  });

  it('should fail to create a single vertex with duplicate key', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    let node = {
      k1: 'v1'
    };

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    });

    node = JSON.parse(response.body);
    response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: node
    });

    expect(response).to.be.an.instanceOf(Object);
    expect(response.statusCode).to.equal(409);
  });

  it('should fail create two vertices with duplicate keys', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    let nodes = [
      {
        k1: 'v1'
      },
      {
        k1: 'v1'
      }
    ];

    let response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    });

    nodes = JSON.parse(response.body);
    response = request.post(`${baseUrl}/document/${collName}`, {
      json: true,
      body: nodes
    });

    expect(response).to.be.an.instanceOf(Object);
    expect(response.statusCode).to.equal(200);

    const resBody = JSON.parse(response.body);
    expect(resBody).to.be.an.instanceOf(Array);
    resBody.forEach(resNode => {
      expect(resNode).to.be.an.instanceOf(Object);
      expect(resNode.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code);
      // noinspection BadExpressionStatementJS
      expect(resNode.errorMessage).to.be.not.empty;
    });
  });

  it('should fail to create a single edge with duplicate key', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex;
    let vnodes = [{}, {}];
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    });
    vnodes = JSON.parse(vResponse.body);

    const eCollName = init.TEST_DATA_COLLECTIONS.edge;
    let enode = {
      k1: 'v1',
      _from: vnodes[0]._id,
      _to: vnodes[1]._id
    };

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    });

    enode = JSON.parse(response.body);
    response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enode
    });

    expect(response).to.be.an.instanceOf(Object);
    expect(response.statusCode).to.equal(409);
  });

  it('should fail create two edges with duplicate keys', () => {
    const vCollName = init.TEST_DATA_COLLECTIONS.vertex;
    let vnodes = [{}, {}];
    const vResponse = request.post(`${baseUrl}/document/${vCollName}`, {
      json: true,
      body: vnodes
    });
    vnodes = JSON.parse(vResponse.body);

    const eCollName = init.TEST_DATA_COLLECTIONS.edge;
    let enodes = [
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id
      },
      {
        k1: 'v1',
        _from: vnodes[0]._id,
        _to: vnodes[1]._id
      }
    ];

    let response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    });

    enodes = JSON.parse(response.body);
    response = request.post(`${baseUrl}/document/${eCollName}`, {
      json: true,
      body: enodes
    });

    expect(response).to.be.an.instanceOf(Object);
    expect(response.statusCode).to.equal(200);

    const resBody = JSON.parse(response.body);
    expect(resBody).to.be.an.instanceOf(Array);
    resBody.forEach(resNode => {
      expect(resNode).to.be.an.instanceOf(Object);
      expect(resNode.errorNum).to.equal(ARANGO_ERRORS.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code);
      // noinspection BadExpressionStatementJS
      expect(resNode.errorMessage).to.be.not.empty;
    });
  });
});