/* eslint-disable no-unused-expressions */
'use strict'

// noinspection NpmUsedModulesInstalled
const { expect } = require('chai')
const init = require('../../../../helpers/init')
const {
  patch, getReturnClause, getSortingClause, getGroupingClause, getShowQueryInitializer
} = require('../../../../../lib/operations/show/helpers')
const {
  cartesian, getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern,
  getRandomNodeBracePathPattern
} = require('../../../../helpers/event')
const { SERVICE_COLLECTIONS, TRANSIENT_EVENT_SUPERNODE } = require('../../../../../lib/helpers')
const diff = require('../../../../../lib/operations/diff')
const jiff = require('jiff')
// noinspection NpmUsedModulesInstalled
const { db, query } = require('@arangodb')

const eventColl = db._collection(SERVICE_COLLECTIONS.events)
const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

describe('Show Helpers - getSortingClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a primary sort clause when countsOnly is falsey, irrespective of sort and groupBy',
    () => {
      const sort = [undefined, 'asc', 'desc']
      const groupBy = [null, 'collection', 'type']
      const countsOnly = false
      const combos = cartesian({ groupBy, sort })
      combos.forEach(combo => {
        const sortingClause = getSortingClause(
          combo.sort,
          combo.groupBy,
          countsOnly
        )

        expect(sortingClause).to.be.an.instanceOf(Object)
        // noinspection JSUnresolvedFunction
        expect(sortingClause).to.respondTo('toAQL')
        expect(sortingClause.toAQL()).to.match(/^sort \S+ (asc|desc)$/i)
      })
    })

  it(
    'should return a primary+secondary sort clause when groupBy is specified and countsOnly is true, irrespective of' +
    ' sort',
    () => {
      const sort = [undefined, 'asc', 'desc']
      const groupBy = ['collection', 'type']
      const countsOnly = true
      const combos = cartesian({ groupBy, sort })
      combos.forEach(combo => {
        const sortingClause = getSortingClause(
          combo.sort,
          combo.groupBy,
          countsOnly
        )

        expect(sortingClause).to.be.an.instanceOf(Object)
        // noinspection JSUnresolvedFunction
        expect(sortingClause).to.respondTo('toAQL')
        expect(sortingClause.toAQL()).to.match(
          /^sort \S+ (asc|desc), \S+ asc$/i
        )
      })
    }
  )

  it(
    'should return a blank sort clause when groupBy is null and countsOnly is true, irrespective of sort',
    () => {
      const sort = [undefined, 'asc', 'desc']
      const groupBy = null
      const countsOnly = true

      sort.forEach(so => {
        const sortingClause = getSortingClause(
          so,
          groupBy,
          countsOnly
        )

        expect(sortingClause).to.be.an.instanceOf(Object)
        // noinspection JSUnresolvedFunction
        expect(sortingClause).to.respondTo('toAQL')
        expect(sortingClause.toAQL()).to.be.empty
      })
    }
  )
})

describe('Show Helpers - getGroupingClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a blank clause when groupBy is null, and countsOnly is falsey', () => {
    const groupBy = null
    const countsOnly = false

    const groupingClause = getGroupingClause(groupBy, countsOnly)

    expect(groupingClause).to.be.an.instanceOf(Object)
    // noinspection JSUnresolvedFunction
    expect(groupingClause).to.respondTo('toAQL')
    // noinspection BadExpressionStatementJS
    expect(groupingClause.toAQL()).to.be.empty
  })

  it('should return a grouping clause when groupBy is specified, and countsOnly is falsey', () => {
    const groupBy = ['collection', 'type']
    const countsOnly = false
    groupBy.forEach(gb => {
      const groupingClause = getGroupingClause(gb, countsOnly)

      expect(groupingClause).to.be.an.instanceOf(Object)
      // noinspection JSUnresolvedFunction
      expect(groupingClause).to.respondTo('toAQL')
      expect(groupingClause.toAQL()).to.match(
        new RegExp(`collect ${gb} = .* into paths = p$`, 'i')
      )
    })
  })

  it('should return a grouping clause when groupBy is specified, and countsOnly is true', () => {
    const groupBy = ['collection', 'type']
    const countsOnly = true

    groupBy.forEach(gb => {
      const groupingClause = getGroupingClause(gb, countsOnly)

      expect(groupingClause).to.be.an.instanceOf(Object)
      // noinspection JSUnresolvedFunction
      expect(groupingClause).to.respondTo('toAQL')
      expect(groupingClause.toAQL()).to.match(
        new RegExp(`collect ${gb} = .* with count into total$`, 'i')
      )
    })
  })

  it('should return a grouping clause when groupBy is null, and countsOnly is true', () => {
    const groupBy = null
    const countsOnly = true

    const groupingClause = getGroupingClause(groupBy, countsOnly)

    expect(groupingClause).to.be.an.instanceOf(Object)
    // noinspection JSUnresolvedFunction
    expect(groupingClause).to.respondTo('toAQL')
    expect(groupingClause.toAQL()).to.equal('collect with count into total')
  })
})

describe('Show Helpers - getReturnClause', () => {
  before(init.setup)

  after(init.teardown)

  it('should return a default return clause when groupBy is null, and countsOnly is falsey, irrespective of other' +
    ' params', () => {
    const groupBy = null
    const countsOnly = false
    const groupSort = [undefined, 'asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 1]
    const combos = cartesian({ groupSort, groupSkip, groupLimit })
    combos.forEach(combo => {
      const returnClause = getReturnClause(
        groupBy,
        countsOnly,
        combo.groupSort,
        combo.groupSkip,
        combo.groupLimit
      )

      expect(returnClause).to.be.an.instanceOf(Object)
      // noinspection JSUnresolvedFunction
      expect(returnClause).to.respondTo('toAQL')
      expect(returnClause.toAQL()).equal('return p')
    })
  })

  it('should return a default return clause when groupBy is null and countsOnly is true, irrespective of other' +
    ' params',
  () => {
    const groupBy = null
    const countsOnly = true
    const groupSort = ['asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 1]
    const combos = cartesian({ groupSort, groupSkip, groupLimit })
    combos.forEach(combo => {
      const returnClause = getReturnClause(
        groupBy,
        countsOnly,
        combo.groupSort,
        combo.groupSkip,
        combo.groupLimit
      )

      expect(returnClause).to.be.an.instanceOf(Object)
      // noinspection JSUnresolvedFunction
      expect(returnClause).to.respondTo('toAQL')
      expect(returnClause.toAQL()).equal('return {total}')
    })
  })

  it('should return a default return clause when groupBy is specified and countsOnly is true, irrespective of other' +
    ' params',
  () => {
    const groupBy = ['collection', 'type']
    const countsOnly = true
    const groupSort = ['asc', 'desc']
    const groupSkip = [0, 1]
    const groupLimit = [0, 1]
    const combos = cartesian({ groupBy, groupSort, groupSkip, groupLimit })
    combos.forEach(combo => {
      const returnClause = getReturnClause(
        combo.groupBy,
        countsOnly,
        combo.groupSort,
        combo.groupSkip,
        combo.groupLimit
      )

      expect(returnClause).to.be.an.instanceOf(Object)
      // noinspection JSUnresolvedFunction
      expect(returnClause).to.respondTo('toAQL')
      expect(returnClause.toAQL()).equal(`return {${combo.groupBy}, total}`)
    })
  })

  it(
    'should return a groupwise-sorted return clause when groupBy is specified and countsOnly is false',
    () => {
      const groupBy = ['collection', 'type']
      const countsOnly = false
      const groupSort = [undefined, 'asc', 'desc']
      const groupSkip = [0, 1]
      const groupLimit = [0, 1]
      const combos = cartesian({ groupBy, groupSort, groupSkip, groupLimit })
      combos.forEach(combo => {
        const returnClause = getReturnClause(
          combo.groupBy,
          countsOnly,
          combo.groupSort,
          combo.groupSkip,
          combo.groupLimit
        )

        expect(returnClause).to.be.an.instanceOf(Object)
        expect(returnClause).to.have.property('query')
        expect(returnClause.query).match(/return.*paths: \(.*paths.*sort.*(asc|desc).*(limit.*)?return p/)
      })
    }
  )
})

describe('Show Helpers - getShowQueryInitializer', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return queryParts', () => {
    const path = ['/', getRandomGraphPathPattern(), getRandomCollectionPathPattern(), getRandomNodeGlobPathPattern(),
      getRandomNodeBracePathPattern()]
    const timestamp = Date.now() / 1000.0

    path.forEach(p => {
      const queryParts = getShowQueryInitializer(p, timestamp)

      expect(queryParts).to.be.an.instanceOf(Array)
      expect(queryParts.length).to.equal(5)
      queryParts.forEach(queryPart => {
        expect(queryPart).to.be.an.instanceOf(Object)
        if (queryPart.hasOwnProperty('toAQL')) {
          // noinspection JSUnresolvedFunction
          expect(queryPart).to.respondTo('toAQL')
        } else {
          expect(queryPart).to.have.property('query')
        }
      })
    })
  })
})

describe('Show Helpers - patch', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }))

  after(init.teardown)

  it('should return patched nodes for the given paths', () => {
    const timestamp = eventColl.any().ctime
    const paths = query`
      for v, e, p in 2..${Number.MAX_SAFE_INTEGER}
      outbound ${TRANSIENT_EVENT_SUPERNODE}._id
      ${commandColl}
        prune v.ctime > ${timestamp}
        filter v.ctime <= ${timestamp}
        collect node = p.vertices[2]._id into paths = p
        let path = (
          for p in paths sort length(p.vertices) desc limit 1 return p
        )
        sort path[0].vertices[2].meta._id asc
      return path[0]
    `.toArray()

    const actualNodes = patch(paths, timestamp)
    // expect(actualNodes).to.be.an.instanceOf(Array)

    const diffs = diff('/', { until: timestamp })

    // noinspection JSUnresolvedFunction
    const expectedNodes = diffs.map(item => {
      let node = {}

      for (let c of item.commands) {
        node = jiff.patch(c, node, {})
      }

      return node
    })

    expect(actualNodes).to.deep.equal(expectedNodes)

    // expect(actualNodes.length).to.equal(expectedNodes.length)
    // expect(actualNodes[0]).to.deep.equal(expectedNodes[0])
    // expectedNodes.forEach((enode, idx) => {
    //   const anode = actualNodes[idx]
    //   expect(anode).to.be.an.instanceOf(Object)
    //   expect(anode._id).to.equal(enode._id)
    //   expect(anode._rev).to.equal(enode._rev)
    // })
  })
})
