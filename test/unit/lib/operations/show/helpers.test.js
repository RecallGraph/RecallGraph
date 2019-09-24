/* eslint-disable no-unused-expressions */
'use strict'

// const { expect } = require('chai')
// const {
//   patch, buildShowQuery
// } = require('../../../../../lib/operations/show/helpers')
// const {
//   getRandomGraphPathPattern, getRandomCollectionPathPattern, getRandomNodeGlobPathPattern,
// getRandomNodeBracePathPattern } = require('../../../../helpers/event')
// const { SERVICE_COLLECTIONS, TRANSIENT_EVENT_SUPERNODE } = require('../../../../../lib/helpers')
// const diff = require('../../../../../lib/operations/diff')
// const jiff = require('jiff')
// const { db, query } = require('@arangodb')
// const init = require('../../../../helpers/init')
//
// const commandColl = db._collection(SERVICE_COLLECTIONS.commands)

// describe('Show Helpers - buildShowQuery', () => {
//   before(() => init.setup({ ensureSampleDataLoad: true }))
//
//   after(init.teardown)
//
//   it('should return queryParts', () => {
//     const path = [
//       '/', getRandomGraphPathPattern(), getRandomCollectionPathPattern(), getRandomNodeGlobPathPattern(),
//       getRandomNodeBracePathPattern()
//     ]
//     const timestamp = Date.now() / 1000.0
//
//     path.forEach(p => {
//       const queryParts = buildShowQuery(p, timestamp)
//
//       expect(queryParts).to.be.an.instanceOf(Array)
//       expect(queryParts.length).to.equal(5)
//       queryParts.forEach(queryPart => {
//         expect(queryPart).to.be.an.instanceOf(Object)
//         if (queryPart.hasOwnProperty('toAQL')) {
//           // noinspection JSUnresolvedFunction
//           expect(queryPart).to.respondTo('toAQL')
//         } else {
//           expect(queryPart).to.have.property('query')
//         }
//       })
//     })
//   })
// })
//
// describe('Show Helpers - patch', () => {
//   before(() => init.setup({ ensureSampleDataLoad: true }))
//
//   after(init.teardown)
//
//   it('should return patched nodes for paths with trailing origin snapshots', () => {
//     const timestamp = getRandomNonOriginEvent()
//     const paths = query`
//       for v, e, p in 2..${Number.MAX_SAFE_INTEGER}
//       outbound ${TRANSIENT_EVENT_SUPERNODE}._id
//       ${commandColl}
//         prune v.ctime > ${timestamp}
//         filter v.ctime <= ${timestamp}
//         collect node = p.vertices[2]._id into paths = p
//         let path = (
//           for p in paths sort length(p.vertices) desc limit 1 return p
//         )
//         sort path[0].vertices[2].meta._id asc
//       return path[0]
//     `.toArray()
//
//     const actualNodes = patch(paths, timestamp)
//     expect(actualNodes).to.be.an.instanceOf(Array)
//
//     const diffs = diff('/', { until: timestamp })
//
//     // noinspection JSUnresolvedFunction
//     const expectedNodes = diffs.map(item => {
//       let node = {}
//
//       for (let c of item.commands) {
//         node = jiff.patch(c, node, {})
//       }
//
//       return node
//     })
//
//     expect(actualNodes).to.deep.equal(expectedNodes)
//   })
// })
