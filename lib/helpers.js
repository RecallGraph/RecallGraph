'use strict'

const { memoize } = require('lodash')
const { db } = require('@arangodb')
const { parse, relative, join } = require('path')
const { Tags: { COMPONENT } } = require('opentracing')

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
