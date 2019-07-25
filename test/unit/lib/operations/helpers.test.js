/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const init = require('../../../helpers/init')
const {
  getDBScope,
  getGraphScope,
  getCollectionScope,
  getNodeGlobScope,
  getNodeBraceScope,
  getScopeFor,
  getSearchPattern,
  getLimitClause
} = require('../../../../lib/operations/helpers')
const {
  getRandomGraphPathPattern,
  getRandomCollectionPathPattern,
  getRandomNodeGlobPathPattern,
  getRandomNodeBracePathPattern
} = require('../../../helpers/eventTestHelpers')

describe('Operations Helpers - get{DB,Graph,Collection,Node{Glob,Brace}}Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return the DB scope', () => {
    const path = '/'

    const scope = getDBScope()

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.equal(path)
    expect(scope).to.not.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Graph scope', () => {
    const scope = getGraphScope()

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/g/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Collection scope', () => {
    const scope = getCollectionScope()

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/c/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Node Glob scope', () => {
    const scope = getNodeGlobScope()

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/ng/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Node Brace scope', () => {
    const scope = getNodeBraceScope()

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/n/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.respondTo('initializers')
  })
})

describe('Log Helpers - getScopeFor', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return the DB scope for the root path', () => {
    const path = '/'
    const scope = getScopeFor(path)

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.equal(path)
    expect(scope).to.not.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Graph scope for a graph-prefixed path pattern', () => {
    const path = getRandomGraphPathPattern()
    const scope = getScopeFor(path)

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/g/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Collection scope for a collection-prefixed path pattern', () => {
    const path = getRandomCollectionPathPattern()
    const scope = getScopeFor(path)

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/c/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Node Glob scope for a node-glob-prefixed path pattern', () => {
    const path = getRandomNodeGlobPathPattern()
    const scope = getScopeFor(path)

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/ng/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.not.respondTo('initializers')
  })

  it('should return the Node Brace scope for a node-prefixed path pattern', () => {
    const path = getRandomNodeBracePathPattern()
    const scope = getScopeFor(path)

    expect(scope).to.be.an.instanceOf(Object)
    expect(scope.pathPattern).to.include('/n/')
    expect(scope).to.respondTo('filters')
    expect(scope).to.respondTo('initializers')
  })
})

describe('Log Helpers - getSearchPattern', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return the DB search pattern for the root path', () => {
    const path = '/'
    const scope = getScopeFor(path)
    const searchPattern = getSearchPattern(scope, path)

    expect(path).to.include(searchPattern)
  })

  it('should return the Graph search pattern for a graph-prefixed path pattern', () => {
    const path = getRandomGraphPathPattern()
    const scope = getScopeFor(path)
    const searchPattern = getSearchPattern(scope, path)

    expect(path).to.include(searchPattern)
  })

  it('should return the Collection search pattern for a collection-prefixed path pattern', () => {
    const path = getRandomCollectionPathPattern()
    const scope = getScopeFor(path)
    const searchPattern = getSearchPattern(scope, path)

    expect(path).to.include(searchPattern)
  })

  it('should return the Node Glob search pattern for a node-glob-prefixed path pattern', () => {
    const path = getRandomNodeGlobPathPattern()
    const scope = getScopeFor(path)
    const searchPattern = getSearchPattern(scope, path)

    expect(path).to.include(searchPattern)
  })

  it('should return the Node Brace search pattern for a node-prefixed path pattern', () => {
    const path = getRandomNodeBracePathPattern()
    const scope = getScopeFor(path)
    const searchPattern = getSearchPattern(scope, path)

    expect(path).to.include(searchPattern)
  })
})

// describe('Log Helpers - getScopeFilters', () => {
//   before(() => init.setup({ ensureSampleDataLoad: true }))
//
//   after(init.teardown)
//
//   it('should return the DB scope filters for the root path', () => {
//     const path = '/'
//     const scope = getScopeFor(path)
//     const searchPattern = getSearchPattern(scope, path)
//     const scopeFilters = getScopeFilters(scope, searchPattern)
//
//     expect(scopeFilters).to.be.an.instanceOf(Object)
//     // noinspection BadExpressionStatementJS
//     expect(scopeFilters.query).to.be.empty
//   })
//
//   it('should return the Graph scope filters for a graph-prefixed path pattern', () => {
//     const path = getRandomGraphPathPattern()
//     const scope = getScopeFor(path)
//     const searchPattern = getSearchPattern(scope, path)
//     const scopeFilters = getScopeFilters(scope, searchPattern)
//
//     expect(scopeFilters).to.be.an.instanceOf(Object)
//     expect(scopeFilters.query).to.include('filter')
//   })
//
//   it('should return the Collection scope filters for a collection-prefixed path pattern', () => {
//     const path = getRandomCollectionPathPattern()
//     const scope = getScopeFor(path)
//     const searchPattern = getSearchPattern(scope, path)
//     const scopeFilters = getScopeFilters(scope, searchPattern)
//
//     expect(scopeFilters).to.be.an.instanceOf(Object)
//     expect(scopeFilters.query).to.include('filter')
//   })
//
//   it('should return the Node Glob scope filters for a node-glob-prefixed path pattern', () => {
//     const path = getRandomNodeGlobPathPattern()
//     const scope = getScopeFor(path)
//     const searchPattern = getSearchPattern(scope, path)
//     const scopeFilters = getScopeFilters(scope, searchPattern)
//
//     expect(scopeFilters).to.be.an.instanceOf(Object)
//     expect(scopeFilters.query).to.include('filter')
//   })
//
//   it('should return the Node Brace scope filters for a node-prefixed path pattern', () => {
//     const path = getRandomNodeBracePathPattern()
//     const scope = getScopeFor(path)
//     const searchPattern = getSearchPattern(scope, path)
//     const scopeFilters = getScopeFilters(scope, searchPattern)
//
//     expect(scopeFilters).to.be.an.instanceOf(Object)
//     expect(scopeFilters.query).to.include('filter')
//   })
// })

// describe('Log Helpers - getScopeInitializers', () => {
//   before(() => init.setup({ ensureSampleDataLoad: true }))
//
//   after(init.teardown)
//
//   it('should return the DB scope initializers for the root path', () => {
//     const path = '/'
//     const scope = getScopeFor(path)
//     const searchPattern = getSearchPattern(scope, path)
//     const scopeInitializers = getScopeInitializers(scope, searchPattern)
//
//     expect(scopeInitializers).to.be.an.instanceOf(Object)
//     // noinspection BadExpressionStatementJS
//     expect(scopeInitializers.query).to.be.empty
//   })
//
//   it('should return the Graph scope initializers for a graph-prefixed path pattern', () => {
//     const path = getRandomGraphPathPattern()
//     const scope = getScopeFor(path)
//     const searchPattern = getSearchPattern(scope, path)
//     const scopeInitializers = getScopeInitializers(scope, searchPattern)
//
//     expect(scopeInitializers).to.be.an.instanceOf(Object)
//     // noinspection BadExpressionStatementJS
//     expect(scopeInitializers.query).to.be.empty
//   })
//
//   it('should return the Collection scope initializers for a collection-prefixed path pattern', () => {
//     const path = getRandomCollectionPathPattern()
//     const scope = getScopeFor(path)
//     const searchPattern = getSearchPattern(scope, path)
//     const scopeInitializers = getScopeInitializers(scope, searchPattern)
//
//     expect(scopeInitializers).to.be.an.instanceOf(Object)
//     // noinspection BadExpressionStatementJS
//     expect(scopeInitializers.query).to.be.empty
//   })
//
//   it('should return the Node Glob scope initializers for a node-glob-prefixed path pattern', () => {
//     const path = getRandomNodeGlobPathPattern()
//     const scope = getScopeFor(path)
//     const searchPattern = getSearchPattern(scope, path)
//     const scopeInitializers = getScopeInitializers(scope, searchPattern)
//
//     expect(scopeInitializers).to.be.an.instanceOf(Object)
//     // noinspection BadExpressionStatementJS
//     expect(scopeInitializers.query).to.be.empty
//   })
//
//   it('should return the Node Brace scope initializers for a node-prefixed path pattern', () => {
//     const path = getRandomNodeBracePathPattern()
//     const scope = getScopeFor(path)
//     const searchPattern = getSearchPattern(scope, path)
//     const scopeInitializers = getScopeInitializers(scope, searchPattern)
//
//     expect(scopeInitializers).to.be.an.instanceOf(Object)
//     // noinspection BadExpressionStatementJS
//     expect(scopeInitializers.query).to.be.not.empty
//   })
// })

describe('Log Helpers - getLimitClause', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return a blank clause when no skip and limit are specified', () => {
    const limitClause = getLimitClause()

    expect(limitClause).to.be.an.instanceOf(Object)
    // noinspection BadExpressionStatementJS
    expect(limitClause.query).to.be.empty
  })

  it('should return a limit clause expression when only limit is specified', () => {
    const limit = 1
    const limitClause = getLimitClause(limit)

    expect(limitClause).to.be.an.instanceOf(Object)
    // noinspection BadExpressionStatementJS
    expect(limitClause.query).to.match(/^limit +@\w+$/i)
  })

  it('should return a limit clause expression when both limit and skip are specified', () => {
    const limit = 1
    const skip = 2
    const limitClause = getLimitClause(limit, skip)

    expect(limitClause).to.be.an.instanceOf(Object)
    // noinspection BadExpressionStatementJS
    expect(limitClause.query).to.match(/^limit @\w+, @\w+$/i)
  })
})

// describe('Log Helpers - getTimeBoundFilters', () => {
//   before(() => init.setup({ ensureSampleDataLoad: true }))
//
//   after(init.teardown)
//
//   it('should return no filters when neither since nor until are specified', () => {
//     const since = null
//     const until = null
//
//     const timeBoundFilters = getTimeBoundFilters(since, until)
//
//     expect(timeBoundFilters).to.be.an.instanceOf(Array)
//     // noinspection BadExpressionStatementJS
//     expect(timeBoundFilters).to.be.empty
//   })
//
//   it('should return a single filter when just one of since or until are specified', () => {
//     const combos = [{ since: 1 }, { until: 1 }]
//     combos.forEach(combo => {
//       const timeBoundFilters = getTimeBoundFilters(combo.since, combo.until)
//
//       expect(timeBoundFilters).to.be.an.instanceOf(Array)
//       // noinspection BadExpressionStatementJS
//       expect(timeBoundFilters).to.have.lengthOf(1)
//       expect(timeBoundFilters[0]).to.be.an.instanceOf(Object)
//       expect(timeBoundFilters[0].query).to.match(/filter v\.ctime [<>]= @\w+/)
//     })
//   })
//
//   it('should return two filters when both since and until are specified', () => {
//     const since = 1
//     const until = 1
//
//     const timeBoundFilters = getTimeBoundFilters(since, until)
//
//     expect(timeBoundFilters).to.be.an.instanceOf(Array)
//     // noinspection BadExpressionStatementJS
//     expect(timeBoundFilters).to.have.lengthOf(2)
//     timeBoundFilters.forEach(tbf => {
//       expect(tbf).to.be.an.instanceOf(Object)
//       expect(tbf.query).to.match(/filter v\.ctime [<>]= @\w+/)
//     })
//   })
// })
