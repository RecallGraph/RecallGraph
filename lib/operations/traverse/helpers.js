'use strict'

const { SERVICE_COLLECTIONS, getCollectionType } = require('../../helpers')
const { getNonServiceCollections } = require('../helpers')
const { db, query } = require('@arangodb')
const { mapValues, chain, remove } = require('lodash')

const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
const skeletonEdgeHubsColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeHubs)
const skeletonEdgeSpokesColl = db._collection(SERVICE_COLLECTIONS.skeletonEdgeSpokes)

function getEnds (direction) {
  const ends = []

  switch (direction.toLowerCase()) {
    case 'inbound':
      ends.push('_from')

      break
    case 'outbound':
      ends.push('_to')

      break
    case 'any':
      ends.push('_from', '_to')
  }

  return ends
}

exports.traverseSkeletonGraph = function traverseSkeletonGraph (timestamp, svid, depth, edgeCollections,
  { bfs, uniqueVertices, uniqueEdges }) {
  depth *= 2

  const collTypes = chain(getNonServiceCollections())
    .map(collName => [collName, getCollectionType(collName)])
    .fromPairs()
    .value()
  const sv = skeletonVerticesColl.firstExample('meta.id', svid)
  const ecs = mapValues(edgeCollections, getEnds)

  return query`
    let collTypes = ${collTypes}
    let ecs = ${ecs}
    let eca = attributes(ecs)
    
    for v, e, p in 0..${depth}
    any ${sv._id}
    ${skeletonEdgeSpokesColl}
    
    prune v.valid_since > ${timestamp} || (has(v, 'valid_until') ? v.valid_until <= ${timestamp} : false) ||
    e != null && (e.valid_since > ${timestamp} || (has(e, 'valid_until') ? e.valid_until <= ${timestamp} : false)) ||
    is_same_collection(v, ${skeletonEdgeHubsColl}) && parse_identifier(v.meta.id).collection not in eca
      
    options {bfs: ${bfs}, uniqueVertices: ${uniqueVertices}, uniqueEdges: ${uniqueEdges}}
      
    filter v.valid_since <= ${timestamp} && (has(v, 'valid_until') ? v.valid_until > ${timestamp} : true)
    filter e == null || e.valid_since <= ${timestamp} && (has(e, 'valid_until') ? e.valid_until > ${timestamp} : true)
    
    let seh = is_same_collection(v, ${skeletonEdgeHubsColl}) ? v : (p.vertices[-2] || v)
    let op = parse_identifier(seh.meta.id)
    let oc = op.collection
    let dKey = (v._id == (e || {})._from) ? '_from' : '_to'
    filter e == null || oc in eca && dKey in ecs[oc]
    
    let vp = parse_identifier(v.meta.id)
    let vc = vp.collection
    collect type = collTypes[vc], coll = vc into keys = vp.key
    
    return {type, coll, keys}
  `.toArray()
}

exports.createNodeBracepath = function createNodeBracepath (nodeGroups) {
  const pathSegments = nodeGroups.map(group => {
    let pathSegment = `${group.coll}/`

    const keys = group.keys
    if (keys.length > 1) {
      pathSegment += `{${keys.join(',')}}`
    } else {
      pathSegment += keys[0]
    }

    return pathSegment
  })

  let path = '/n/'
  if (pathSegments.length > 1) {
    path += `{${pathSegments.join(',')}}`
  } else {
    path += pathSegments[0]
  }

  return path
}

function buildFilteredGraph (svid, vertices, edges, path = { vertices: [], edges: [] }) {
  const [v] = remove(vertices, v => v._id === svid)
  path.vertices.push(v)

  const incidentEdges = remove(edges, e => chain(e).pick('_from', '_to').includes(v._id))
  path.edges.push(...incidentEdges)

  for (const e of incidentEdges) {
    const nvid = e._from === v._id ? e._to : e._from

    buildFilteredGraph(nvid, vertices, edges, path)
  }

  return path
}

exports.buildFilteredGraph = buildFilteredGraph

exports.removeOrphans = function removeOrphans (vertices, edges) {
  // let ne, nv
  //
  // do {
  //   ne = remove(edges, e => [e._from, e._to].some(vid => !vertices.find(v => v._id === vid))).length
  //
  //   if (edges.length > 0) {
  //     nv = remove(vertices, v => !edges.some(e => [e._from, e._to].includes(v._id))).length
  //   } else {
  //     nv = ne = 0
  //   }
  // } while ((ne > 0) || (nv > 0))

  remove(edges, e => [e._from, e._to].some(vid => !vertices.find(v => v._id === vid)))
  remove(vertices, v => !edges.some(e => [e._from, e._to].includes(v._id)))
}
