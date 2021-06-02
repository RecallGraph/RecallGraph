'use strict'

const { expect } = require('chai')
const { db, query } = require('@arangodb')
const init = require('../util/init')
const { random, sampleSize, stubTrue, map, isEqual, last, isEmpty, isObject, pick, omit } = require('lodash')
const show = require('../../../lib/operations/show')
const traverse = require('../../../lib/operations/traverse')
const { kShortestPaths } = require('../../../lib/operations/k_shortest_paths/helpers')
const { kShortestPaths: kShortestPathsHandler } = require('../../../lib/handlers/kShortestPathsHandlers')
const { SERVICE_COLLECTIONS, EVENTS: { CREATED } } = require('../../../lib/constants')
const cytoscape = require('cytoscape')
const { cartesian, generateFilters } = require('../util')
const { parseExpr } = require('../../../lib/operations/helpers')
const request = require('@arangodb/request')

const { baseUrl } = module.context
const eventsColl = db._collection(SERVICE_COLLECTIONS.events)

function getRandomTimestamp () {
  const { airports, flights } = init.getFlightDataRefs().collections

  const minCtime = query`
    for e in ${eventsColl}
    filter e.collection == ${flights}
    filter e.event == ${CREATED}
    
    collect aggregate ctime = avg(e.ctime)
    
    return ctime
  `.next()

  const maxCtime = query`
    for e in ${eventsColl}
    filter e.collection in [${airports}, ${flights}]
    
    collect aggregate ctime = max(e.ctime)
    
    return ctime
  `.next()

  return random(minCtime, maxCtime)
}

function loadCy (timestamp) {
  const { airports, flights } = init.getFlightDataRefs().collections

  let path = `/c/${airports}`
  const vertices = show(path, timestamp)

  const vkeys = JSON.stringify(map(vertices, '_key'))
  path = `/c/${flights}`
  const postFilter = `
    ([_from, _to])
      .map(ary(partialRight($_.invoke, 'slice', -3), 1))
      .every(partial($_.has, zipObject(${vkeys}, ('1').repeat(${vkeys.length}))))
  `
  const edges = show(path, timestamp, { postFilter })

  const cy = cytoscape()
  cy.startBatch()
  cy.add(vertices.map(v => ({
    group: 'nodes',
    data: Object.assign({
      id: v._id
    }, v)
  })))
  cy.add(edges.map(e => ({
    group: 'edges',
    data: Object.assign({
      id: `outbound-${e._id}`,
      source: e._from,
      target: e._to
    }, e)
  })))
  cy.add(edges.map(e => ({
    group: 'edges',
    data: Object.assign({
      id: `inbound-${e._id}`,
      source: e._to,
      target: e._from
    }, e)
  })))
  cy.endBatch()

  return cy
}

function pickDirection (elements, direction) {
  const nodes = elements.nodes()
  const edges = elements.edges(`[id ^= '${direction}']`)

  return nodes.union(edges)
}

function testKShortestPaths (kspFn) {
  const { flights } = init.getFlightDataRefs().collections
  const timestamp = getRandomTimestamp()
  const cy = loadCy(timestamp)

  const skip = [0, 1]
  const limit = [1, 2]
  const edgeCollections = ['inbound', 'outbound', 'any'].map(dir => ({
    [flights]: dir
  }))
  const vFilter = [undefined, generateFilters(cy.nodes().map(el => omit(el.data(), 'id')))]
  const eFilter = [
    undefined,
    generateFilters(cy.edges('[id ^= \'outbound\']').map(el => omit(el.data(), 'id', 'source', 'target')))
  ]

  const combos = cartesian({ skip, limit, edgeCollections, vFilter, eFilter })
  combos.forEach(combo => {
    const { skip, limit, edgeCollections, vFilter, eFilter } = combo

    const vFilterFn = vFilter ? parseExpr(vFilter) : stubTrue
    const eFilterFn = eFilter ? parseExpr(eFilter) : stubTrue

    const direction = edgeCollections[flights]
    const isDirected = ['inbound', 'outbound'].includes(direction)
    let directedElements = cy.elements()
    if (isDirected) {
      directedElements = pickDirection(directedElements, direction)
    }

    const filteredElements = directedElements.filter(el => {
      const data = el.data()

      return el.isNode() ? vFilterFn(data) : eFilterFn(data)
    })
    const components = filteredElements.components().filter(component => component.size() > 1)

    components.forEach(component => {
      const vertices = component.nodes().toArray()
      let sv, ev, aStar
      do {
        const sample = sampleSize(vertices, 2)

        sv = sample[0]
        ev = sample[1]

        aStar = component.aStar({
          root: sv,
          goal: ev,
          directed: true
        })
      } while (!aStar.found)

      const path = aStar.path.slice(0, 7)
      const svid = sv.id()
      const evid = path.nodes().last().id()
      const depth = path.edges().size()

      // console.debug({
      //   path: path.map(el => {
      //     const key = el.data('_key')
      //
      //     if (el.isNode()) {
      //       return `[${key}]`
      //     } else {
      //       const dir = el.id().split('-', 1)[0]
      //       const [prefix, suffix] = dir === 'inbound' ? ['<', ''] : ['', '>']
      //
      //       return `${prefix}--(${key})--${suffix}`
      //     }
      //   }).join(''),
      //   depth,
      //   direction,
      //   svid,
      //   evid
      // })

      const params = JSON.stringify({
        timestamp, svid, evid, depth, skip, limit, edgeCollections, vFilter, eFilter
      })

      const ksp = kspFn(timestamp, svid, evid, depth, edgeCollections, skip, limit,
        { vFilter, eFilter, weightExpr: 'price' })

      expect(ksp, params).to.be.an.instanceOf(Array)

      ksp.forEach(path => {
        expect(path, params).to.be.an.instanceOf(Object)
        expect(path.vertices, params).to.be.an.instanceOf(Array)
        expect(path.edges, params).to.be.an.instanceOf(Array)
      })

      const unfilteredExpectedPaths = traverse(timestamp, svid, 1, depth, edgeCollections, {
        uniqueVertices: 'path',
        vFilter: `_id === '${evid}'`,
        returnVertices: false,
        returnEdges: false
      }).paths
      const unsortedExpectedPaths = unfilteredExpectedPaths.filter(
        path => path.vertices.every(vFilterFn) && path.edges.every(eFilterFn))
      const expectedPaths = kShortestPaths(unsortedExpectedPaths, parseExpr('price'), skip, limit)

      expect(ksp.length, params).to.equal(expectedPaths.length)
      ksp.forEach((path, i) => {
        const ePath = expectedPaths[i]
        if (!isEqual(path, ePath)) {
          expect(path.cost, params).to.equal(ePath.cost)
          expect(path.edges.length, params).to.be.at.most(depth)

          const sv = path.vertices[0]
          const ev = last(path.vertices)
          expect(sv._id, params).to.equal(svid)
          expect(ev._id, params).to.equal(evid)

          if (isDirected) {
            path.edges.forEach((edge, j) => {
              const source = path.vertices[j]
              const target = path.vertices[j + 1]

              switch (direction) {
                case 'inbound':
                  expect(source._id, params).to.equal(edge._to)
                  expect(target._id, params).to.equal(edge._from)

                  break

                case 'outbound':
                  expect(source._id, params).to.equal(edge._from)
                  expect(target._id, params).to.equal(edge._to)
              }
            })
          }
        }
      })
    })
  })
}

function kspHandlerWrapper (timestamp, svid, evid, depth, edgeCollections, skip, limit, options) {
  const req = {
    queryParams: { timestamp, svid, evid, depth, skip, limit },
    body: { edges: edgeCollections }
  }

  if (isObject(options)) {
    for (const key of ['vFilter', 'eFilter', 'weightExpr']) {
      if (!isEmpty(options[key])) {
        req.body[key] = options[key]
      }
    }
  }

  return kShortestPathsHandler(req)
}

function kspPostWrapper (timestamp, svid, evid, depth, edgeCollections, skip, limit, options) {
  const req = { json: true, timeout: 120, qs: { svid, evid, depth, skip, limit }, body: { edges: edgeCollections } }

  if (timestamp) {
    req.qs.timestamp = timestamp
  }

  if (isObject(options)) {
    for (const key of ['vFilter', 'eFilter', 'weightExpr']) {
      if (!isEmpty(options[key])) {
        req.body[key] = options[key]
      }
    }
  }

  const response = request.post(`${baseUrl}/history/kShortestPaths`, req)
  expect(response).to.be.an.instanceOf(Object)

  const params = JSON.stringify({ request: req, response: pick(response, 'statusCode', 'body', 'message') })
  expect(response.statusCode, params).to.equal(200)

  return JSON.parse(response.body)
}

module.exports = {
  testKShortestPaths,
  kspHandlerWrapper,
  kspPostWrapper
}
