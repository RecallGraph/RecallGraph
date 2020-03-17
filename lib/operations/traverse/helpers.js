'use strict'

const { SERVICE_COLLECTIONS, SERVICE_GRAPHS, getCollectionType } = require('../../helpers')
const { getNonServiceCollections } = require('../helpers')
const { db, query } = require('@arangodb')
const { mapValues, chain, remove } = require('lodash')

const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)

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
  const sv = skeletonVerticesColl.firstExample('meta.id', svid)

  if ((sv.valid_since <= timestamp) && (!sv.valid_until || (sv.valid_until > timestamp))) {
    depth *= 2

    const collTypes = chain(getNonServiceCollections())
      .map(collName => [collName, getCollectionType(collName)])
      .fromPairs()
      .value()
    const ecs = mapValues(edgeCollections, getEnds)

    return query`
      let collTypes = ${collTypes}
      let ecs = ${ecs}
      let eca = attributes(ecs)
      
      for v, e, p in 0..${depth}
      any ${sv._id}
      graph ${SERVICE_GRAPHS.skeleton}
      
      prune v == null ||
        v.valid_since > ${timestamp} ||
        (has(v, 'valid_until') ? v.valid_until <= ${timestamp} : false) ||
        e != null &&
        (e.valid_since > ${timestamp} || (has(e, 'valid_until') ? e.valid_until <= ${timestamp} : false)) ||
        is_same_collection(${SERVICE_COLLECTIONS.skeletonEdgeHubs}, v) &&
        (
          parse_identifier(v.meta.id).collection not in eca ||
          ((v._id == e._from) ? '_from' : '_to') not in ecs[parse_identifier(v.meta.id).collection]
        )
        
      options {bfs: ${bfs}, uniqueVertices: ${uniqueVertices}, uniqueEdges: ${uniqueEdges}}
        
      filter v != null && v.valid_since <= ${timestamp} && (has(v, 'valid_until') ? v.valid_until > ${timestamp} : true)
      filter e == null || e.valid_since <= ${timestamp} && (has(e, 'valid_until') ? e.valid_until > ${timestamp} : true)
      
      let seh = is_same_collection(${SERVICE_COLLECTIONS.skeletonEdgeHubs}, v) ? v : p.vertices[-2]
      let op = seh && parse_identifier(seh.meta.id)
      let oc = op && op.collection
      let dKey = e && (v._id == e._from) ? '_from' : '_to'
      filter e == null || oc in eca && dKey in ecs[oc]
      
      let vp = parse_identifier(v.meta.id)
      let vc = vp.collection
      collect type = collTypes[vc], coll = vc into keys = vp.key
      
      return {type, coll, keys: unique(keys)}
  `.toArray()
  } else {
    return []
  }
}

exports.createNodeBracepath = function createNodeBracepath (nodeGroups) {
  const pathSegments = nodeGroups.map(group => {
    let pathSegment = `${group.coll}/`

    const keys = Array.isArray(group.keys) ? group.keys : Array.from(group.keys)
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
  } else if (pathSegments.length === 1) {
    path += pathSegments[0]
  }

  return path
}

function buildFilteredGraph (svid, vertices, edges, path = { vertices: [], edges: [] }) {
  const [v] = remove(vertices, v => v._id === svid)
  if (v) {
    path.vertices.push(v)

    const incidentEdges = remove(edges, e => [e._from, e._to].includes(v._id))
    path.edges.push(...incidentEdges)

    for (const e of incidentEdges) {
      const nvid = (e._from === v._id) ? e._to : e._from

      buildFilteredGraph(nvid, vertices, edges, path)
    }
  }

  return path
}
exports.buildFilteredGraph = buildFilteredGraph

exports.removeFreeEdges = function removeFreeEdges (vertices, edges) {
  remove(edges, e => [e._from, e._to].some(vid => !vertices.find(v => v._id === vid)))
}
