'use strict';

const { expect } = require('chai');
const {
  getScopeFor, getSearchPattern, getScopeFilters, getScopeInitializers, getLimitClause, getSortingClause,
  getGroupingClause, getReturnClause, getTimeBoundFilters
} = require('../../../../../lib/operations/log/helpers');
const init = require('../../../../helpers/init');
const {
  getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern,
  getRandomNodeBracePathPattern, cartesian
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

  it('should return a primary+secondary sort clause when groupBy is null, irrespective of sortType and countsOnly',
    () => {
      const sortType = [null, 'asc', 'desc'], groupBy = null, countsOnly = [false, true];
      const combos = cartesian({ countsOnly, sortType });
      combos.forEach(combo => {
        const sortingClause = getSortingClause(combo.sortType, groupBy, combo.countsOnly);

        expect(sortingClause).to.be.an.instanceOf(Object);
        expect(sortingClause).to.respondTo('toAQL');
        expect(sortingClause.toAQL()).to.match(/^sort \S+ (asc|desc), \S+ asc$/i);
      });
    });

  it('should return a primary+secondary sort clause when groupBy is specified and countsOnly is true, irrespective of' +
    ' sortType', () => {
    const sortType = [null, 'asc', 'desc'], groupBy = ['node', 'collection', 'event'], countsOnly = true;
    const combos = cartesian({ groupBy, sortType });
    combos.forEach(combo => {
      const sortingClause = getSortingClause(combo.sortType, combo.groupBy, countsOnly);

      expect(sortingClause).to.be.an.instanceOf(Object);
      expect(sortingClause).to.respondTo('toAQL');
      expect(sortingClause.toAQL()).to.match(/^sort \S+ (asc|desc), \S+ asc$/i);
    });
  });

  it('should return a secondary sort clause when groupBy is specified and countsOnly is false, irrespective of' +
    ' sortType', () => {
    const sortType = [null, 'asc', 'desc'], groupBy = ['node', 'collection', 'event'], countsOnly = false;
    const combos = cartesian({ groupBy, sortType });
    combos.forEach(combo => {
      const sortingClause = getSortingClause(combo.sortType, combo.groupBy, countsOnly);

      expect(sortingClause).to.be.an.instanceOf(Object);
      expect(sortingClause).to.respondTo('toAQL');
      expect(sortingClause.toAQL()).to.match(/^sort \S+ asc$/i);
    });
  });
});

describe('Log Helpers - getTimeBoundFilters', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return no filters when neither since nor until are specified', () => {
    const since = null, until = null;

    const timeBoundFilters = getTimeBoundFilters(since, until);

    expect(timeBoundFilters).to.be.an.instanceOf(Array);
    // noinspection BadExpressionStatementJS
    expect(timeBoundFilters).to.be.empty;
  });

  it('should return a single filter when just one of since or until are specified', () => {
    const combos = [{ since: 1 }, { until: 1 }];
    combos.forEach(combo => {
      const timeBoundFilters = getTimeBoundFilters(combo.since, combo.until);

      expect(timeBoundFilters).to.be.an.instanceOf(Array);
      // noinspection BadExpressionStatementJS
      expect(timeBoundFilters).to.have.lengthOf(1);
      expect(timeBoundFilters[0]).to.be.an.instanceOf(Object);
      expect(timeBoundFilters[0].query).to.match(/filter v\.ctime [<>]= @\w+/);
    });
  });

  it('should return two filters when both since and until are specified', () => {
    const since = 1, until = 1;

    const timeBoundFilters = getTimeBoundFilters(since, until);

    expect(timeBoundFilters).to.be.an.instanceOf(Array);
    // noinspection BadExpressionStatementJS
    expect(timeBoundFilters).to.have.lengthOf(2);
    timeBoundFilters.forEach(tbf => {
      expect(tbf).to.be.an.instanceOf(Object);
      expect(tbf.query).to.match(/filter v\.ctime [<>]= @\w+/);
    });
  });
});

describe('Log Helpers - getGroupingClause', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return a blank clause when no groupBy specified, irrespective of countsOnly', () => {
    const groupBy = null, countsOnly = [false, true];
    countsOnly.forEach(co => {
      const groupingClause = getGroupingClause(groupBy, co);

      expect(groupingClause).to.be.an.instanceOf(Object);
      expect(groupingClause).to.respondTo('toAQL');
      // noinspection BadExpressionStatementJS
      expect(groupingClause.toAQL()).to.be.empty;
    });
  });

  it('should return a grouping clause when groupBy is specified, irrespective of countsOnly', () => {
    const groupBy = ['node', 'collection', 'event'], countsOnly = [false, true];
    const combos = cartesian({ groupBy, countsOnly });
    combos.forEach(combo => {
      const groupingClause = getGroupingClause(combo.groupBy, combo.countsOnly);

      expect(groupingClause).to.be.an.instanceOf(Object);
      expect(groupingClause).to.respondTo('toAQL');
      expect(groupingClause.toAQL()).to.match(new RegExp(`collect ${combo.groupBy} = .*$`, 'i'));
    });
  });
});

describe('Log Helpers - getReturnClause', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return a default return clause when groupBy is null, irrespective of countsOnly and sortType', () => {
    const groupBy = null, countsOnly = [false, true], sortType = [null, 'asc', 'desc'];
    const combos = cartesian({ countsOnly, sortType });
    combos.forEach(combo => {
      const returnClause = getReturnClause(combo.sortType, groupBy, combo.countsOnly);

      expect(returnClause).to.be.an.instanceOf(Object);
      expect(returnClause).to.respondTo('toAQL');
      expect(returnClause.toAQL()).include('return');
    });
  });

  it('should return a default return clause when groupBy is specified and countsOnly is true, irrespective of sortType',
    () => {
      const groupBy = ['node', 'collection', 'event'], countsOnly = true, sortType = [null, 'asc', 'desc'];
      const combos = cartesian({ groupBy, sortType });
      combos.forEach(combo => {
        const returnClause = getReturnClause(combo.sortType, combo.groupBy, countsOnly);

        expect(returnClause).to.be.an.instanceOf(Object);
        expect(returnClause).to.respondTo('toAQL');
        expect(returnClause.toAQL()).include('return');
      });
    });

  it('should return a sorted-group return clause when groupBy is specified and countsOnly is false, irrespective of' +
    ' sortType',
    () => {
      const groupBy = ['node', 'collection', 'event'], countsOnly = false, sortType = [null, 'asc', 'desc'];
      const combos = cartesian({ groupBy, sortType });
      combos.forEach(combo => {
        const returnClause = getReturnClause(combo.sortType, combo.groupBy, countsOnly);

        expect(returnClause).to.be.an.instanceOf(Object);
        expect(returnClause).to.respondTo('toAQL');

        const aqlFragment = returnClause.toAQL();
        expect(aqlFragment).match(/events.*sort.*(asc|desc) return/);
      });
    });
});