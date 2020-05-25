'use strict'

const { db, aql } = require('@arangodb')
const { SERVICE_COLLECTIONS, getComponentTagOption } = require('../../helpers')
const { utils: { attachSpan, instrumentedQuery } } = require('foxx-tracing')

const cto = getComponentTagOption(__filename)
const {
  events, commands, snapshots, snapshotLinks, evtSSLinks, skeletonVertices, skeletonEdgeHubs, skeletonEdgeSpokes
} = SERVICE_COLLECTIONS
const skeletonVerticesColl = db._collection(skeletonVertices)
const skeletonEdgeHubsColl = db._collection(skeletonEdgeHubs)
const skeletonEdgeSpokesColl = db._collection(skeletonEdgeSpokes)
const snapshotsColl = db._collection(snapshots)
const snapshotLinksColl = db._collection(snapshotLinks)
const evtSSLinksColl = db._collection(evtSSLinks)
const commandsColl = db._collection(commands)
const eventsColl = db._collection(events)

// Public
function removeSkeletonVertices (vids) {
  const query = aql`
    for v in ${skeletonVerticesColl}
    filter v.meta.id in ${vids}
    
    remove v in ${skeletonVerticesColl}
    
    return OLD._id
  `

  return instrumentedQuery(query, 'removeSvQuery', cto).toArray()
}

function removeSkeletonEdgeHubs (eids) {
  const query = aql`
    for v in ${skeletonEdgeHubsColl}
    filter v.meta.id in ${eids}
    
    remove v in ${skeletonEdgeHubsColl}
    
    return OLD._id
  `

  return instrumentedQuery(query, 'removeSehQuery', cto).toArray()
}

function removeSkeletonEdgeSpokes (sehIds) {
  const query = aql`
    for e in ${skeletonEdgeSpokesColl}
    filter e.hub in ${sehIds}
    
    remove e in ${skeletonEdgeSpokesColl}
    
    return OLD._id
  `

  return instrumentedQuery(query, 'removeSeSQuery', cto).toArray()
}

function removeSnapshots (nids) {
  const query = aql`
    for v in ${snapshotsColl}
    filter v.data._id in ${nids}
    
    remove v in ${snapshotsColl}
    
    return OLD._id
  `

  return instrumentedQuery(query, 'removeSsQuery', cto).toArray()
}

function removeSnapshotLinks (sids) {
  const query = aql`
    for e in ${snapshotLinksColl}
    filter [e._from, e._to] any in ${sids}
    
    remove e in ${snapshotLinksColl}
    
    return OLD._id
  `

  return instrumentedQuery(query, 'removeSlQuery', cto).toArray()
}

function removeEventSnapshotLinks (sids) {
  const query = aql`
    for e in ${evtSSLinksColl}
    filter e._to in ${sids}
    
    remove e in ${evtSSLinksColl}
    
    return OLD._id
  `

  return instrumentedQuery(query, 'removeEslQuery', cto).toArray()
}

function removeCommands (eids) {
  const query = aql`
    for e in ${commandsColl}
    filter [e._from, e._to] any in ${eids}
    
    remove e in ${commandsColl}
    
    return OLD._id
  `

  return instrumentedQuery(query, 'removeCommandsQuery', cto).toArray()
}

function removeEvents (eids) {
  eventsColl.remove(eids, { silent: true })
}

module.exports = {
  removeSkeletonVertices: attachSpan(removeSkeletonVertices, 'removeSkeletonVertices', cto),
  removeSkeletonEdgeHubs: attachSpan(removeSkeletonEdgeHubs, 'removeSkeletonEdgeHubs', cto),
  removeSkeletonEdgeSpokes: attachSpan(removeSkeletonEdgeSpokes, 'removeSkeletonEdgeSpokes', cto),
  removeSnapshots: attachSpan(removeSnapshots, 'removeSnapshots', cto),
  removeSnapshotLinks: attachSpan(removeSnapshotLinks, 'removeSnapshotLinks', cto),
  removeEventSnapshotLinks: attachSpan(removeEventSnapshotLinks, 'removeEventSnapshotLinks', cto),
  removeCommands: attachSpan(removeCommands, 'removeCommands', cto),
  removeEvents: attachSpan(removeEvents, 'removeEvents', cto)
}
