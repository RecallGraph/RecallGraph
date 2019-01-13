'use strict';

const { expect } = require('chai');
const {
  getScopeFor, getSearchPattern, getScopeFilters, getScopeInitializers, getLimitClause, getSortingClause,
  getGroupingClause
} = require('../../../../../lib/operations/log/helpers');
const init = require('../../../../helpers/init');
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern,
  getRandomNodeBracePathPattern
} = require('../../../../helpers/logTestHelper');

describe('Log Helpers - getScopeFor', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return the DB scope for the root path', () => {
    const path = '/';
    const scope = getScopeFor(path);

    expect(scope).to.be.an.instanceOf(Object);
    expect(scope.pathPattern).to.equal(path);
    expect(scope).to.not.respondTo('filters');
    expect(scope).to.not.respondTo('initializers');
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
  before(() => init.setup({ ensureSampleDataLoad: true }));

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

describe('Log Helpers - getScopeFilters', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return the DB scope filters for the root path', () => {
    const path = '/';
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);
    const scopeFilters = getScopeFilters(scope, searchPattern);

    expect(scopeFilters).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(scopeFilters.query).to.be.empty;
  });

  it('should return the Graph scope filters for a graph-prefixed path pattern', () => {
    const path = getRandomGraphPathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);
    const scopeFilters = getScopeFilters(scope, searchPattern);

    expect(scopeFilters).to.be.an.instanceOf(Object);
    expect(scopeFilters.query).to.include('filter');
  });

  it('should return the Collection scope filters for a collection-prefixed path pattern', () => {
    const path = getRandomCollectionPathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);
    const scopeFilters = getScopeFilters(scope, searchPattern);

    expect(scopeFilters).to.be.an.instanceOf(Object);
    expect(scopeFilters.query).to.include('filter');
  });

  it('should return the Node Glob scope filters for a node-glob-prefixed path pattern', () => {
    const path = getRandomNodeGlobPathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);
    const scopeFilters = getScopeFilters(scope, searchPattern);

    expect(scopeFilters).to.be.an.instanceOf(Object);
    expect(scopeFilters.query).to.include('filter');
  });

  it('should return the Node Brace scope filters for a node-prefixed path pattern', () => {
    const path = getRandomNodeBracePathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);
    const scopeFilters = getScopeFilters(scope, searchPattern);

    expect(scopeFilters).to.be.an.instanceOf(Object);
    expect(scopeFilters.query).to.include('filter');
  });
});

describe('Log Helpers - getScopeInitializers', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return the DB scope initializers for the root path', () => {
    const path = '/';
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);
    const scopeInitializers = getScopeInitializers(scope, searchPattern);

    expect(scopeInitializers).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(scopeInitializers.query).to.be.empty;
  });

  it('should return the Graph scope initializers for a graph-prefixed path pattern', () => {
    const path = getRandomGraphPathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);
    const scopeInitializers = getScopeInitializers(scope, searchPattern);

    expect(scopeInitializers).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(scopeInitializers.query).to.be.empty;
  });

  it('should return the Collection scope initializers for a collection-prefixed path pattern', () => {
    const path = getRandomCollectionPathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);
    const scopeInitializers = getScopeInitializers(scope, searchPattern);

    expect(scopeInitializers).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(scopeInitializers.query).to.be.empty;
  });

  it('should return the Node Glob scope initializers for a node-glob-prefixed path pattern', () => {
    const path = getRandomNodeGlobPathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);
    const scopeInitializers = getScopeInitializers(scope, searchPattern);

    expect(scopeInitializers).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(scopeInitializers.query).to.be.empty;
  });

  it('should return the Node Brace scope initializers for a node-prefixed path pattern', () => {
    const path = getRandomNodeBracePathPattern();
    const scope = getScopeFor(path);
    const searchPattern = getSearchPattern(scope, path);
    const scopeInitializers = getScopeInitializers(scope, searchPattern);

    expect(scopeInitializers).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(scopeInitializers.query).to.be.not.empty;
  });
});

describe('Log Helpers - getLimitClause', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return a blank clause when no skip and limit are specified', () => {
    const limitClause = getLimitClause();

    expect(limitClause).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(limitClause.query).to.be.empty;
  });

  it('should return a limit clause expression when only limit is specified', () => {
    const limit = 1;
    const limitClause = getLimitClause(limit);

    expect(limitClause).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(limitClause.query).to.match(/^limit +@\w+$/i);
  });

  it('should return a limit clause expression when both limit and skip are specified', () => {
    const limit = 1, skip = 2;
    const limitClause = getLimitClause(limit, skip);

    expect(limitClause).to.be.an.instanceOf(Object);
    // noinspection BadExpressionStatementJS
    expect(limitClause.query).to.match(/^limit @\w+, @\w+$/i);
  });
});

describe('Log Helpers - getSortingClause', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return a blank clause when no sort type specified, irrespective of groupBy and countsOnly', () => {
    const sortType = null, groupBy = [null, 'node', 'collection', 'event'], countsOnly = [false, true];
    for (const gb of groupBy) {
      for (const co of countsOnly) {
        const sortingClause = getSortingClause(sortType, gb, co);

        expect(sortingClause).to.be.an.instanceOf(Object);
        // noinspection BadExpressionStatementJS
        expect(sortingClause.query).to.be.empty;
      }
    }
  });

  it('should return a sort clause when sort type is specified, irrespective of groupBy and countsOnly', () => {
    const sortType = ['asc', 'desc'], groupBy = [null, 'node', 'collection', 'event'], countsOnly = [false, true];
    for (const st of sortType) {
      for (const gb of groupBy) {
        for (const co of countsOnly) {
          const sortingClause = getSortingClause(st, gb, co);

          expect(sortingClause).to.be.an.instanceOf(Object);
          // noinspection BadExpressionStatementJS
          expect(sortingClause.query).to.match(/^sort \S+ (asc|desc)$/i);
        }
      }
    }
  });
});

describe('Log Helpers - getGroupingClause', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return a blank clause when no groupBy specified, irrespective of countsOnly', () => {
    const groupBy = null, countsOnly = [false, true];
    for (const co of countsOnly) {
      const groupingClause = getGroupingClause(groupBy, co);

      expect(groupingClause).to.be.an.instanceOf(Object);
      // noinspection BadExpressionStatementJS
      expect(groupingClause.query).to.be.empty;
    }
  });

  it('should return a grouping clause when groupBy is specified, irrespective of countsOnly', () => {
    const groupBy = ['node', 'collection', 'event'], countsOnly = [false, true];
    for (const gb of groupBy) {
      for (const co of countsOnly) {
        const groupingClause = getGroupingClause(gb, co);

        expect(groupingClause).to.be.an.instanceOf(Object);
        // noinspection BadExpressionStatementJS
        expect(groupingClause.query).to.match(/collect grp = .*$/i);
      }
    }
  });
});
