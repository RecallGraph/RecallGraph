'use strict'

const {
  SERVICE_COLLECTIONS: { events, commands, skeletonVertices, skeletonEdgeHubs, skeletonEdgeSpokes },
  EVENTS: { COLL_INIT, INIT }
} = require('../lib/constants')
const { db, query } = require('@arangodb')
const { ensureIndexes } = require('../lib/helpers')

const messages = []
const eventsColl = db._collection(events)
const commandsColl = db._collection(commands)
const skeletonVerticesColl = db._collection(skeletonVertices)
const skeletonEdgeHubsColl = db._collection(skeletonEdgeHubs)
const skeletonEdgeSpokesColl = db._collection(skeletonEdgeSpokes)

// Removed old indexes
for (const coll of [eventsColl, commandsColl, skeletonVerticesColl, skeletonEdgeHubsColl, skeletonEdgeSpokesColl]) {
  coll.getIndexes().filter(index => index.name.startsWith('idx_')).forEach(index => {
    try {
      coll.dropIndex(index)
      messages.push(`Dropped index ${index.name} in collection ${coll.name()}`)
    } catch (e) {
      console.error(e.stack)
      messages.push(e.message)
    }
  })
}

// Create new indexes
const indexMessages = ensureIndexes()
for (const collName in indexMessages) {
  messages.push(...indexMessages[collName])
}

// Update event log
let count = query`
  for e in ${eventsColl}
  filter e.meta.id != null && e.collection == null
  
  update e with {
    collection: parse_identifier(e.meta.id).collection
  } in ${eventsColl}
  
  collect with count into total
  
  return total
`.next()
messages.push(`Updated ${count} events with field 'collection'.`)

count = query`
  for e in ${eventsColl}
  filter e['hops-from-origin'] == 0 && e['origin-for'] != null
  
  update e with {
    collection: e['origin-for'],
    ctime: 0,
    event: ${COLL_INIT},
    meta: {
      id: e._id
    },
    'origin-for': null
  } in ${eventsColl} options { keepNull: false }
  
  collect with count into total
  
  return total
`.next()
messages.push(`Updated ${count} origin events with fields 'collection', 'ctime', 'event', 'meta.id'.`)

count = query`
  for e in ${eventsColl}
  filter e['is-super-origin-node'] && e['collection'] == null
  limit 1
  
  update e with {
    collection: ${events},
    ctime: 0,
    event: ${INIT},
    meta: {
      id: e._id
    },
    'hops-from-origin': -1
  } in ${eventsColl} options { keepNull: false }
  
  collect with count into total
  
  return total
`.next()
messages.push(
  `Updated ${count} super origin event with fields 'collection', 'ctime', 'event', 'meta.id', 'hops-from-origin'.`)

count = query`
  for c in ${commandsColl}
  filter c._from == concat_separator('/', ${events}, 'origin') && c.meta.id == null
  
  update c with {
    meta: {
      id: c._to
    }
  } in ${commandsColl}
  
  collect with count into total
  
  return total
`.next()
messages.push(`Updated ${count} commands with field 'meta.id'.`)

// Update skeleton graph
count = query`
  for sv in ${skeletonVerticesColl}
  filter sv.valid_since != null
  
  update sv with {
    collection: parse_identifier(sv.meta.id).collection,
    validity: [
      {
        valid_since: sv.valid_since,
        valid_until: sv.valid_until || ${Number.MAX_VALUE}
      }
    ],
    valid_since: null,
    valid_until: null
  } in ${skeletonVerticesColl} options { keepNull: false }
  
  collect with count into total
  
  return total
`.next()
messages.push(`Updated ${count} skeleton vertices with fields 'collection', 'validity'.`)

count = query`
  for seh in ${skeletonEdgeHubsColl}
  filter seh.valid_since != null
  
  update seh with {
    collection: parse_identifier(seh.meta.id).collection,
    validity: [
      {
        valid_since: seh.valid_since,
        valid_until: seh.valid_until || ${Number.MAX_VALUE}
      }
    ],
    valid_since: null,
    valid_until: null
  } in ${skeletonEdgeHubsColl} options { keepNull: false }
  
  collect with count into total
  
  return total
`.next()
messages.push(`Updated ${count} skeleton edge hubs with fields 'collection', 'validity'.`)

count = query`
  for ses in ${skeletonEdgeSpokesColl}
  filter ses.valid_since != null
  
  update ses with {
    collection: parse_identifier(ses.meta.id).collection,
    validity: [
      {
        valid_since: ses.valid_since,
        valid_until: ses.valid_until || ${Number.MAX_VALUE}
      }
    ],
    valid_since: null,
    valid_until: null
  } in ${skeletonEdgeSpokesColl} options { keepNull: false }
  
  collect with count into total
  
  return total
`.next()
messages.push(`Updated ${count} skeleton edge spokes with fields 'collection', 'validity'.`)

module.exports = messages
