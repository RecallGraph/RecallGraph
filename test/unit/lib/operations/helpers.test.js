'use strict';

const { expect } = require("chai");
const init = require('../../../helpers/init');
const commitHelpers = require('../../../../lib/operations/helpers');
const createHandlers = require('../../../../lib/handlers/createHandlers');
const replaceHandlers = require('../../../../lib/handlers/replaceHandlers');
const db = require('@arangodb').db;
const SERVICE_COLLECTIONS = require('../../../../lib/helpers').SERVICE_COLLECTIONS;
const omit = require('lodash/omit');
const jiff = require('jiff');

describe('Commit Helpers - getLatestEvent', () => {
  before(init.setup);

  after(init.teardown);

  it('should return the origin event for a non-existent node', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex);
    const node = {
      _id: 'does-not-exist'
    };
    const origin = commitHelpers.getTransientEventOriginFor(coll);
    const latestEvent = commitHelpers.getLatestEvent(node, coll);

    expect(latestEvent).to.be.an.instanceOf(Object);
    expect(latestEvent).to.deep.equal(origin);
  });

  it('should return the origin event for a non-committed but persisted node', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex);
    const node = coll.insert({});
    const origin = commitHelpers.getTransientEventOriginFor(coll);
    const latestEvent = commitHelpers.getLatestEvent(node, coll);

    expect(latestEvent).to.be.an.instanceOf(Object);
    expect(latestEvent).to.deep.equal(origin);
  });

  it('should return a \'create\' event node for a node created through service', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const coll = db._collection(collName);
    const pathParams = {
      collection: collName
    };
    const body = {};
    const node = createHandlers.createSingle({ pathParams, body });
    const latestEvent = commitHelpers.getLatestEvent(node, coll);

    expect(latestEvent).to.be.an.instanceOf(Object);
    expect(latestEvent.meta).to.be.an.instanceOf(Object);
    expect(latestEvent.meta.event).to.equal('created');
    expect(latestEvent.meta._id).to.equal(node._id);
    expect(latestEvent.meta).to.have.property('ctime');
  });

  it('should return an \'update\' event node for a committed node replaced through service', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const coll = db._collection(collName);
    const pathParams = {
      collection: collName
    };
    const body = {};
    let node = createHandlers.createSingle({ pathParams, body });
    node.k1 = 'v1';
    node = replaceHandlers.replaceSingle({ pathParams, body: node });

    const latestEvent = commitHelpers.getLatestEvent(node, coll);

    expect(latestEvent).to.be.an.instanceOf(Object);
    expect(latestEvent.meta).to.be.an.instanceOf(Object);
    expect(latestEvent.meta.event).to.equal('updated');
    expect(latestEvent.meta._id).to.equal(node._id);
    expect(latestEvent.meta).to.have.property('ctime');
    expect(latestEvent.meta).to.have.property('mtime');
  });

  it('should return an \'update\' event node for a non-committed node replaced through service', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const coll = db._collection(collName);
    const pathParams = {
      collection: collName
    };
    let node = coll.insert({});
    node.k1 = 'v1';
    node = replaceHandlers.replaceSingle({ pathParams, body: node });

    const latestEvent = commitHelpers.getLatestEvent(node, coll);

    expect(latestEvent).to.be.an.instanceOf(Object);
    expect(latestEvent.meta).to.be.an.instanceOf(Object);
    expect(latestEvent.meta.event).to.equal('updated');
    expect(latestEvent.meta._id).to.equal(node._id);
    expect(latestEvent.meta).to.not.have.property('ctime');
    expect(latestEvent.meta).to.have.property('mtime');
  });
});

describe('Commit Helpers - getTransientOrCreateLatestSnapshot', () => {
  before(init.setup);

  after(init.teardown);

  it('should return a new snapshot node for a non-committed but persisted node', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex);
    const node = coll.insert({});
    const latestEvent = commitHelpers.getLatestEvent(node, coll);
    const ssData = commitHelpers.getTransientOrCreateLatestSnapshot(coll.name(), latestEvent, node);
    const ssNode = ssData.ssNode;

    expect(ssNode).to.be.an.instanceOf(Object);
    expect(ssData.hopsFromLast).to.equal(2);
    // noinspection BadExpressionStatementJS
    expect(ssData.prevSSid).to.be.undefined;
  });
});

describe('Commit Helpers - insertEventNode', () => {
  before(init.setup);

  after(init.teardown);

  it('should return an event node for \'created\' event', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex);
    const node = coll.insert({});
    const time = new Date();
    const latestEvent = commitHelpers.getLatestEvent(node, coll);
    const ssData = commitHelpers.getTransientOrCreateLatestSnapshot(coll.name(), latestEvent, node, time);
    const evtNode = commitHelpers.insertEventNode(node, 'ctime', time, 'created', ssData, latestEvent);

    expect(evtNode).to.be.an.instanceOf(Object);
    expect(evtNode).to.have.property('_id');
    expect(evtNode).to.have.property('_key');
    expect(evtNode).to.have.property('_rev');
    expect(evtNode.meta).to.be.an.instanceOf(Object);
    Object.keys(node).forEach(key => expect(evtNode.meta[key]).to.deep.equal(node[key]));
    expect(evtNode.meta.event).to.equal('created');
    expect(evtNode.meta.ctime).to.equal(time.toISOString());
    expect(evtNode.meta['last-snapshot']).to.equal(ssData.ssNode._id);
    expect(evtNode.meta['hops-from-last-snapshot']).to.equal(ssData.hopsFromLast);
    // noinspection BadExpressionStatementJS
    expect(evtNode.meta.mtime).to.be.undefined;
  });

  it('should return an event node for \'updated\' event', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex);
    let node = coll.insert({});
    const ctime = new Date();
    const latestEvent = commitHelpers.getLatestEvent(node, coll);
    let ssData = commitHelpers.getTransientOrCreateLatestSnapshot(coll.name(), latestEvent, node, ctime);
    let evtNode = commitHelpers.insertEventNode(node, 'ctime', ctime, 'created', ssData, latestEvent);

    node.k1 = 'v1';
    node = coll.replace(node._id, node);
    const mtime = new Date();
    ssData = commitHelpers.getTransientOrCreateLatestSnapshot(coll.name(), evtNode, node, ctime, mtime);
    evtNode = commitHelpers.insertEventNode(node, 'mtime', mtime, 'updated', ssData, evtNode);

    expect(evtNode).to.be.an.instanceOf(Object);
    expect(evtNode).to.have.property('_id');
    expect(evtNode).to.have.property('_key');
    expect(evtNode).to.have.property('_rev');
    expect(evtNode.meta).to.be.an.instanceOf(Object);
    Object.keys(node).forEach(key => expect(evtNode.meta[key]).to.deep.equal(node[key]));
    expect(evtNode.meta.event).to.equal('updated');
    expect(evtNode.meta.ctime).to.equal(ctime.toISOString());
    expect(evtNode.meta.mtime).to.equal(mtime.toISOString());
    expect(evtNode.meta['last-snapshot']).to.equal(ssData.ssNode._id);
    expect(evtNode.meta['hops-from-last-snapshot']).to.equal(ssData.hopsFromLast);
  });
});

describe('Commit Helpers - insertCommandEdge', () => {
  before(init.setup);

  after(init.teardown);

  it('should return a new command edge', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex);
    const node = coll.insert({ k1: 'v1' }, { returnNew: true });
    node.old = {};
    const ctime = new Date();
    const latestEvent = commitHelpers.getLatestEvent(node, coll);
    const ssData = commitHelpers.getTransientOrCreateLatestSnapshot(coll.name(), latestEvent, node.new, ctime);
    const evtNode = commitHelpers.insertEventNode(omit(node, 'new'), 'ctime', ctime, 'created', ssData, latestEvent);

    const enode = commitHelpers.insertCommandEdge(latestEvent, evtNode, node.old, node.new);

    expect(enode).to.be.an.instanceOf(Object);
    expect(enode).to.have.property('_id');
    expect(enode).to.have.property('_key');
    expect(enode).to.have.property('_rev');
    expect(enode._from).to.equal(latestEvent._id);
    expect(enode._to).to.equal(evtNode._id);
    expect(enode.command).to.deep.equal(jiff.diff(node.old, node.new));
  });
});

describe('Commit Helpers - insertEvtSSLink', () => {
  before(init.setup);

  after(init.teardown);

  it('should return a new event-snapshot link', () => {
    const evtSSCollName = SERVICE_COLLECTIONS.evtSSLinks;
    const [from, to] = [`${evtSSCollName}/void-1`, `${evtSSCollName}/void-2`];
    const enode = commitHelpers.insertEvtSSLink(from, to);

    expect(enode).to.be.an.instanceOf(Object);
    expect(enode).to.have.property('_id');
    expect(enode).to.have.property('_key');
    expect(enode).to.have.property('_rev');
    expect(enode._from).to.equal(from);
    expect(enode._to).to.equal(to);
  });
});

describe('Commit Helpers - ensureOriginNode', () => {
  before(init.setup);

  after(init.teardown);

  it('should ensure presence of an origin node', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex);
    const eventColl = db._collection(SERVICE_COLLECTIONS.events);
    const origin = commitHelpers.getTransientEventOriginFor(coll);

    commitHelpers.ensureOriginNode(coll.name());
    const node = eventColl.document(origin._id);

    expect(node).to.be.an.instanceOf(Object);
    Object.keys(origin).forEach(key => expect(node[key]).to.deep.equal(origin[key]));
    expect(node).to.have.property('_rev');
  });
});

describe('Commit Helpers - getTransientEventOriginFor', () => {
  before(init.setup);

  after(init.teardown);

  it('should return a transient origin node', () => {
    const coll = db._collection(init.TEST_DATA_COLLECTIONS.vertex);
    const key = `origin-${coll._id}`;
    const expectedOrigin = {
      _id: `${SERVICE_COLLECTIONS.events}/${key}`,
      _key: key,
      'is-origin-node': true,
      'origin-for': coll.name()
    };

    const origin = commitHelpers.getTransientEventOriginFor(coll);

    Object.keys(expectedOrigin).forEach(key => expect(origin[key]).to.deep.equal(expectedOrigin[key]));
  });
});