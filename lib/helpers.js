'use strict'

const { memoize } = require('lodash')
const { db } = require('@arangodb')
const { parse, relative, join } = require('path')
const { Tags: { COMPONENT } } = require('opentracing')
const {
  SERVICE_COLLECTIONS: { events, commands, skeletonVertices, skeletonEdgeHubs, skeletonEdgeSpokes }
} = require('./constants')

const libRoot = join(module.context.basePath, 'lib')

exports.snapshotInterval = function snapshotInterval (collName) {
  const snapshotIntervals = module.context.configuration['snapshot-intervals']
  const interval = parseInt(snapshotIntervals[collName])

  return Number.isInteger(interval) ? interval : parseInt(snapshotIntervals._default)
}

exports.getCollectionType = memoize((collName) => db._collection(collName).type())

exports.getComponentTagOption = function getComponent (filePath) {
  const relPath = relative(libRoot, filePath)
  const components = parse(relPath)

  return {
    tags: {
      [COMPONENT]: join(components.dir, components.name)
    }
  }
}

exports.ensureIndexes = function ensureIndexes () {
  const indexMessages = {
    [events]: [],
    [commands]: [],
    [skeletonVertices]: [],
    [skeletonEdgeHubs]: [],
    [skeletonEdgeSpokes]: []
  }
  let index

  const eventsColl = db._collection(events)
  try {
    index = eventsColl.ensureIndex({
      name: 'mid-evt-ct_010000',
      type: 'persistent',
      sparse: false,
      unique: false,
      deduplicate: false,
      fields: ['meta.id', 'event', 'ctime']
    })
    indexMessages[events].push(`Created index ${index.name} in collection ${events}`)
  } catch (e) {
    console.error(e.stack)
    indexMessages[events].push(e.message)
  }

  try {
    index = eventsColl.ensureIndex({
      name: 'col_010000',
      type: 'persistent',
      sparse: false,
      unique: false,
      deduplicate: false,
      fields: ['collection']
    })
    indexMessages[events].push(`Created index ${index.name} in collection ${events}`)
  } catch (e) {
    console.error(e.stack)
    indexMessages[events].push(e.message)
  }

  try {
    index = eventsColl.ensureIndex({
      name: 'ct_010000',
      type: 'persistent',
      sparse: false,
      unique: false,
      deduplicate: false,
      fields: ['ctime']
    })
    indexMessages[events].push(`Created index ${index.name} in collection ${events}`)
  } catch (e) {
    console.error(e.stack)
    indexMessages[events].push(e.message)
  }

  try {
    index = eventsColl.ensureIndex({
      name: 'hop_010000',
      type: 'persistent',
      sparse: false,
      unique: false,
      deduplicate: false,
      fields: ['hops-from-origin']
    })
    indexMessages[events].push(`Created index ${index.name} in collection ${events}`)
  } catch (e) {
    console.error(e.stack)
    indexMessages[events].push(e.message)
  }

  const commandsColl = db._collection(commands)
  try {
    index = commandsColl.ensureIndex({
      name: 'fr-mid_010000',
      type: 'persistent',
      sparse: true,
      unique: true,
      deduplicate: false,
      fields: ['_from', 'meta.id']
    })
    indexMessages[commands].push(`Created index ${index.name} in collection ${commands}`)
  } catch (e) {
    console.error(e.stack)
    indexMessages[events].push(e.message)
  }

  const skeletonVerticesColl = db._collection(skeletonVertices)
  try {
    index = skeletonVerticesColl.ensureIndex({
      name: 'col_010000',
      type: 'persistent',
      sparse: false,
      unique: false,
      deduplicate: false,
      fields: ['collection']
    })
    indexMessages[skeletonVertices].push(`Created index ${index.name} in collection ${skeletonVertices}`)
  } catch (e) {
    console.error(e.stack)
    indexMessages[events].push(e.message)
  }

  const skeletonEdgeHubsColl = db._collection(skeletonEdgeHubs)
  try {
    index = skeletonEdgeHubsColl.ensureIndex({
      name: 'col_010000',
      type: 'persistent',
      sparse: false,
      unique: false,
      deduplicate: false,
      fields: ['collection']
    })
    indexMessages[skeletonEdgeHubs].push(`Created index ${index.name} in collection ${skeletonEdgeHubs}`)
  } catch (e) {
    console.error(e.stack)
    indexMessages[events].push(e.message)
  }

  const skeletonEdgeSpokesColl = db._collection(skeletonEdgeSpokes)
  try {
    index = skeletonEdgeSpokesColl.ensureIndex({
      name: 'hub_010000',
      type: 'persistent',
      sparse: false,
      unique: false,
      deduplicate: false,
      fields: ['hub']
    })
    indexMessages[skeletonEdgeSpokes].push(`Created index ${index.name} in collection ${skeletonEdgeSpokes}`)
  } catch (e) {
    console.error(e.stack)
    indexMessages[events].push(e.message)
  }

  return indexMessages
}
