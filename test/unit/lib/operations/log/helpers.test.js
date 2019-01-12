'use strict';

const { expect } = require('chai');
const { getScopeFor, getSearchPattern } = require('../../../../../lib/operations/log/helpers');
const init = require('../../../../helpers/init');
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern,
  getRandomNodeBracePathPattern
} = require('../../../../helpers/logTestHelper');

describe('Log Helpers - getScopeFor', () => {
  before(() => init.setup({ shouldLoadSampleData: true }));

  after(init.teardown);

  it('should return the DB scope for the root path', () => {
    const path = '/';
    const scope = getScopeFor(path);

    expect(scope).to.be.an.instanceOf(Object);
    expect(scope.pathPattern).to.equal(path);
  });

  it('should return the Graph scope for a graph-prefixed path pattern', () => {
    const path = getRandomGraphPathPattern();
    const scope = getScopeFor(path);

    expect(scope).to.be.an.instanceOf(Object);
    expect(scope.pathPattern).to.include('/g/');
    expect(scope).to.respondTo('filters');
    expect(scope).to.not.respondTo('initializers');
  });

  it('should return the Collection scope for a collection-prefixed path pattern', () => {
    const path = getRandomCollectionPathPattern();
    const scope = getScopeFor(path);

    expect(scope).to.be.an.instanceOf(Object);
    expect(scope.pathPattern).to.include('/c/');
    expect(scope).to.respondTo('filters');
    expect(scope).to.not.respondTo('initializers');
  });

  it('should return the Node Glob scope for a node-glob-prefixed path pattern', () => {
    const path = getRandomNodeGlobPathPattern();
    const scope = getScopeFor(path);

    expect(scope).to.be.an.instanceOf(Object);
    expect(scope.pathPattern).to.include('/ng/');
    expect(scope).to.respondTo('filters');
    expect(scope).to.not.respondTo('initializers');
  });

  it('should return the Node Brace scope for a node-prefixed path pattern', () => {
    const path = getRandomNodeBracePathPattern();
    const scope = getScopeFor(path);

    expect(scope).to.be.an.instanceOf(Object);
    expect(scope.pathPattern).to.include('/n/');
    expect(scope).to.respondTo('filters');
    expect(scope).to.respondTo('initializers');
  });
});

describe('Log Helpers - getSearchPattern', () => {
  before(() => init.setup({ shouldLoadSampleData: true }));

  after(init.teardown);

  it('should return the DB search pattern for the root path', () => {
    const path = '/';
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);

    expect(path).to.include(searchPattern);
  });

  it('should return the Graph search pattern for a graph-prefixed path pattern', () => {
    const path = getRandomGraphPathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);

    expect(path).to.include(searchPattern);
  });

  it('should return the Collection search pattern for a collection-prefixed path pattern', () => {
    const path = getRandomCollectionPathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);

    expect(path).to.include(searchPattern);
  });

  it('should return the Node Glob search pattern for a node-glob-prefixed path pattern', () => {
    const path = getRandomNodeGlobPathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);

    expect(path).to.include(searchPattern);
  });

  it('should return the Node Brace search pattern for a node-prefixed path pattern', () => {
    const path = getRandomNodeBracePathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);

    expect(path).to.include(searchPattern);
  });
});