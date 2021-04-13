'use strict'

const fs = require('fs')
const gg = require('@arangodb/general-graph')
const { db, query, errors: ARANGO_ERRORS } = require('@arangodb')
const { chain, mapValues, isEqual, omitBy, isEmpty, trim, invokeMap, pick, cloneDeep, map } = require('lodash')
const { createSingle } = require('../../../lib/handlers/createHandlers')
const { replaceSingle } = require('../../../lib/handlers/replaceHandlers')
const { removeMultiple } = require('../../../lib/handlers/removeHandlers')
const purge = require('../../../lib/operations/purge')
const restore = require('../../../lib/operations/restore')
const cytoscape = require('cytoscape')
const { COLL_TYPES_REF, COLLECTION_TYPES, SERVICE_COLLECTIONS } = require('../../../lib/constants')

const RG2CY_TYPE_MAP = {
  vertex: 'nodes',
  edge: 'edges'
}
const RG2CY_FIELD_MAP = {
  _id: 'id',
  _from: 'source',
  _to: 'target'
}

// Private
function rg2cy (data) {
  const result = []

  for (const el of data) {
    const group = RG2CY_TYPE_MAP[el.type]
    for (const node of el.nodes) {
      const item = {}
      for (const k in node) {
        item[k] = node[k]

        const mappedField = RG2CY_FIELD_MAP[k]
        if (mappedField) {
          item[mappedField] = node[k]
        }
      }
      item.coll = item.id.split('/')[0]

      result.push({
        group,
        data: item
      })
    }
  }

  return result
}

function loadCy (colls) {
  console.log(`About to load following collection data into CY instance: ${invokeMap(colls, 'name').join(', ')}`)

  const nodes = chain(COLLECTION_TYPES).map(type => [type, []]).fromPairs().value()

  for (const coll of colls) {
    const data = coll.all().toArray()
    nodes[coll.type()].push(...data)

    console.log(`Loaded ${data.length} elements from ${coll.name()} into cy buffer.`)
  }

  const data = map(nodes, (nodes, type) => ({
    type: COLL_TYPES_REF[type],
    nodes
  }))
  const els = rg2cy(data)
  // console.log({ els })

  const cy = cytoscape()
  cy.startBatch()
  cy.add(els)
  cy.endBatch()

  return cy
}

// Public
module.exports = function loadSampleData (testDataCollections) {
  console.log('Starting sample data load...')

  // Define collection metadata
  const sampleDataCollections = pick(testDataCollections, 'rawData', 'stars', 'planets', 'moons', 'asteroids', 'comets',
    'dwarfPlanets', 'lineage')
  const colls = mapValues(sampleDataCollections, collName => db._collection(collName))
  const { rawData, stars, planets, moons, asteroids, comets, dwarfPlanets, lineage } = colls
  const {
    events,
    commands,
    snapshots,
    snapshotLinks,
    evtSSLinks,
    skeletonEdgeHubs,
    skeletonEdgeSpokes,
    skeletonVertices
  } = mapValues(SERVICE_COLLECTIONS, collName => db._collection(collName))

  // Init results
  const results = {
    messages: [],
    vertexCollections: undefined,
    edgeCollections: undefined,
    graphs: [],
    milestones: [],
    cyGraphs: {
      milestones: []
    }
  }

  // Load and insert raw data
  const resourcePath = 'test/resources'
  const dataPattern = /^SS_Objects_.+\.json$/
  let docCount = 0
  let insertCount = 0
  let errorCount = 0
  let pathParams = {
    collection: rawData.name()
  }
  fs.list(module.context.fileName(resourcePath))
    .filter(filename => dataPattern.test(filename))
    .map(filename => `../../../${resourcePath}/${filename}`)
    .forEach(fileName => {
      try {
        const jsonArr = cloneDeep(require(fileName))
        jsonArr.forEach(jsonObj => {
          docCount++
          jsonObj._source = fileName
          createSingle({ pathParams, body: jsonObj })
          insertCount++
        })
      } catch (e) {
        errorCount++
        console.error(e.message, e.stack)
      }
    })

  let message = `Inserted ${insertCount} out of ${docCount} documents into ${rawData.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData]))

  // Remove footnote references from raw data
  let cursor = rawData.all()
  const footnoteRefPattern = /\[[0-9]+]/g
  let replaceCount = 0
  docCount = errorCount = 0
  while (cursor.hasNext()) {
    docCount++
    const object = cursor.next()
    const newObj = mapValues(object, value => {
      if (typeof value === 'string') {
        return value.replace(footnoteRefPattern, '')
      }

      return value
    })

    if (!isEqual(object, newObj)) {
      try {
        replaceSingle({ pathParams, body: newObj })
        replaceCount++
      } catch (e) {
        errorCount++
        console.error(e.message, e.stack)
      }
    }
  }

  message = `Replaced ${replaceCount} out of ${docCount} documents in ${rawData.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData]))

  // Remove empty/unspecified fields from raw data
  cursor = rawData.all()
  docCount = errorCount = replaceCount = 0
  const unspecifiedPattern = /^[-–]+$/
  while (cursor.hasNext()) {
    docCount++
    const object = cursor.next()
    const newObj = omitBy(object, value => {
      value = trim(value)

      return isEmpty(value) || unspecifiedPattern.test(value)
    })

    if (!isEqual(object, newObj)) {
      try {
        replaceSingle({ pathParams, body: newObj })
        replaceCount++
      } catch (e) {
        errorCount++
        console.error(e.message, e.stack)
      }
    }
  }

  message = `Replaced ${replaceCount} out of ${docCount} documents in ${rawData.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData]))

  // Insert spaces at title-case boundaries in Body field in raw data
  docCount = errorCount = replaceCount = 0
  cursor = query`
    for r in ${rawData}
      let spBodyParts = regex_split(r.Body, "(?<!(^|[A-Z]))(?=[A-Z])|(?<!^)(?=[A-Z][a-z])")
      filter length(spBodyParts) > 1
      let trBodyParts = spBodyParts[* filter not regex_test(CURRENT, '(^\\\\s*$)') return trim(CURRENT)]
      let body = concat_separator(' ', trBodyParts)
      filter r.Body != body
    return merge(r, {Body: body})
  `
  while (cursor.hasNext()) {
    docCount++
    const object = cursor.next()
    try {
      replaceSingle({ pathParams, body: object })
      replaceCount++
    } catch (e) {
      errorCount++
      console.error(e.message, e.stack)
    }
  }

  message = `Replaced ${replaceCount} out of ${docCount} documents in ${rawData.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData]))

  // Insert spaces at alpha-numeric boundaries in Body field in raw data
  docCount = errorCount = replaceCount = 0
  cursor = query`
    for r in ${rawData}
      let body = regex_replace(r.Body, '([a-z])([0-9])', '$1 $2')
      filter r.Body != body
    return merge(r, {Body: body})
  `
  while (cursor.hasNext()) {
    docCount++
    const object = cursor.next()
    try {
      replaceSingle({ pathParams, body: object })
      replaceCount++
    } catch (e) {
      errorCount++
      console.error(e.message, e.stack)
    }
  }

  message = `Replaced ${replaceCount} out of ${docCount} documents in ${rawData.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData]))

  // Populate stars
  cursor = rawData.byExample({ Type: 'star' })
  docCount = insertCount = errorCount = 0
  while (cursor.hasNext()) {
    docCount++
    const obj = cursor.next()
    try {
      pathParams = {
        collection: stars.name()
      }
      const star = createSingle({ pathParams, body: obj })

      pathParams = {
        collection: rawData.name()
      }
      obj._ref = star._id
      replaceSingle({ pathParams, body: obj })

      insertCount++
    } catch (e) {
      errorCount++
      console.error(e.message, e.stack)
    }
  }

  message = `Inserted ${insertCount} out of ${docCount} documents into ${stars.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData, stars]))

  // Populate planets
  docCount = insertCount = errorCount = 0
  const sun = stars.firstExample({ Body: 'Sun' })
  cursor = query`
  for d in fulltext(${rawData}, 'Type', 'planet,-dwarf')
  return d
`
  while (cursor.hasNext()) {
    docCount++
    const obj = cursor.next()

    try {
      pathParams = {
        collection: planets.name()
      }
      const planet = createSingle({ pathParams, body: obj })

      const linEdge = {
        _from: sun._id,
        _to: planet._id
      }
      pathParams = {
        collection: lineage.name()
      }
      createSingle({ pathParams, body: linEdge })

      pathParams = {
        collection: rawData.name()
      }
      obj._ref = planet._id
      replaceSingle({ pathParams, body: obj })

      insertCount++
    } catch (e) {
      errorCount++
      console.error(e.message, e.stack)
    }
  }

  message = `Inserted ${insertCount} out of ${docCount} documents into ${planets.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData, stars, planets, lineage]))

  // Populate dwarf planets
  docCount = insertCount = errorCount = 0
  cursor = query`
  for d in fulltext(${rawData}, 'Type', 'dwarf,|TNO,|plutino,|sednoid,|cubewano,|KBO,|SDO,|detached,|prefix:trans,|centaur,|twotino,|classical,|secondary')
  return d
`
  while (cursor.hasNext()) {
    docCount++
    const obj = cursor.next()

    try {
      pathParams = {
        collection: dwarfPlanets.name()
      }
      const dwarfPlanet = createSingle({ pathParams, body: obj })

      const linEdge = {
        _from: sun._id,
        _to: dwarfPlanet._id
      }
      pathParams = {
        collection: lineage.name()
      }
      createSingle({ pathParams, body: linEdge })

      pathParams = {
        collection: rawData.name()
      }
      obj._ref = dwarfPlanet._id
      replaceSingle({ pathParams, body: obj })

      insertCount++
    } catch (e) {
      errorCount++
      console.error(e.message, e.stack)
    }
  }

  message = `Inserted ${insertCount} out of ${docCount} documents into ${dwarfPlanets.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData, stars, planets, dwarfPlanets, lineage]))

  // Populate asteroids
  docCount = insertCount = errorCount = 0
  cursor = query`
  for d in fulltext(${rawData}, 'Type', 'asteroid,|NEA,|trojan')
  return d
`
  while (cursor.hasNext()) {
    docCount++
    const obj = cursor.next()

    try {
      pathParams = {
        collection: asteroids.name()
      }
      const asteroid = createSingle({ pathParams, body: obj })

      const linEdge = {
        _from: sun._id,
        _to: asteroid._id
      }
      pathParams = {
        collection: lineage.name()
      }
      createSingle({ pathParams, body: linEdge })

      pathParams = {
        collection: rawData.name()
      }
      obj._ref = asteroid._id
      replaceSingle({ pathParams, body: obj })

      insertCount++
    } catch (e) {
      errorCount++
      console.error(e.message, e.stack)
    }
  }

  message = `Inserted ${insertCount} out of ${docCount} documents into ${asteroids.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData, stars, planets, dwarfPlanets, asteroids, lineage]))

  // Populate comets
  docCount = insertCount = errorCount = 0
  cursor = query`
    for d in fulltext(${rawData}, 'Type', 'comet')
    return d
  `
  while (cursor.hasNext()) {
    docCount++
    const obj = cursor.next()

    try {
      pathParams = {
        collection: comets.name()
      }
      const comet = createSingle({ pathParams, body: obj })

      const linEdge = {
        _from: sun._id,
        _to: comet._id
      }
      pathParams = {
        collection: lineage.name()
      }
      createSingle({ pathParams, body: linEdge })

      pathParams = {
        collection: rawData.name()
      }
      obj._ref = comet._id
      replaceSingle({ pathParams, body: obj })

      insertCount++
    } catch (e) {
      errorCount++
      console.error(e.message, e.stack)
    }
  }

  message = `Inserted ${insertCount} out of ${docCount} documents into ${comets.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData, stars, planets, dwarfPlanets, asteroids, comets, lineage]))

  // Populate moons
  docCount = insertCount = errorCount = 0
  let warningCount = 0
  let failedMoonKeys = []
  cursor = query`
    for m in fulltext(${rawData}, 'Type', 'prefix:moon,|prefix:satellite')
      let parent = concat(regex_replace(m.Type, '^.*([Mm]oon|[Ss]atellite)s? of ([0-9A-Za-z\\\\s]+);?.*$', '$2'), '%')
      let o = (
          for b in ${rawData}
          filter not regex_test(b.Type, '(moon|satellite)', true)
          filter like(b.Body, parent)
          return b
      )
    return {"moon": m, "rawObject": o[0]}
  `
  while (cursor.hasNext()) {
    docCount++
    const obj = cursor.next()
    if (obj.rawObject) {
      try {
        pathParams = {
          collection: moons.name()
        }
        const moon = createSingle({ pathParams, body: obj.moon })

        const linEdge = {
          _from: obj.rawObject._ref,
          _to: moon._id
        }
        pathParams = {
          collection: lineage.name()
        }
        createSingle({ pathParams, body: linEdge })

        pathParams = {
          collection: rawData.name()
        }
        obj.moon._ref = obj.moon._ref ? [obj.moon._ref, moon._id] : moon._id
        replaceSingle({ pathParams, body: obj.moon })

        insertCount++
      } catch (e) {
        errorCount++
        console.error(e, e.stack, obj)
      }
    } else {
      warningCount++
      failedMoonKeys.push(obj.moon._key)
      console.warn(
        `No suitable parent object found for moon ${obj.moon._id}. Skipped.`
      )
    }
  }

  message = `Inserted ${insertCount} out of ${docCount} documents into ${moons.name()} with ${errorCount} errors and ${warningCount} warnings`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData, stars, planets, dwarfPlanets, asteroids, comets, moons, lineage]))

  // Cleanup raw data of entries copied to other collections
  errorCount = 0
  docCount = rawData.count()
  let removeCount = 0
  const rids = query`
    for r in ${rawData}
      filter has(r, '_ref') && r._key not in ${failedMoonKeys}
    return keep(r, '_key')
  `.toArray()

  pathParams = {
    collection: rawData.name()
  }
  const rnodes = removeMultiple({ pathParams, body: rids })
  rnodes.forEach(rnode => {
    if (rnode.errorNum) {
      errorCount++
    } else {
      removeCount++
    }
  })

  message = `Removed ${removeCount} out of ${docCount} documents from ${rawData.name()} with ${errorCount} errors`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData, stars, planets, dwarfPlanets, asteroids, comets, moons, lineage]))

  // Purge unmapped raw data
  const unmappedKeys = map(rawData.all().toArray(), '_key').join(',')
  let path = `/n/${rawData.name()}/{${unmappedKeys}}`
  const purged = purge(path, { deleteUserObjects: true })
  removeCount = purged.user[rawData.name()]

  message = `Purged ${removeCount} documents from ${rawData.name()}`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData, stars, planets, dwarfPlanets, asteroids, comets, moons, lineage]))

  // Restore deleted raw data
  path = `/c/${rawData.name()}`
  const restored = restore(path)
  docCount = restored.length

  message = `Restored ${docCount} documents in ${rawData.name()}`
  console.log(message)
  results.messages.push(message)
  results.milestones.push(Date.now() / 1000)
  results.cyGraphs.milestones.push(loadCy([rawData, stars, planets, dwarfPlanets, asteroids, comets, moons, lineage]))

  // (Re-)Create Solar System Objects Graph
  const ssGraph = `${module.context.collectionPrefix}test_ss_lineage`
  let edgeDefs
  try {
    const lineageRel = gg._relation(
      lineage.name(),
      invokeMap([stars, planets, dwarfPlanets, asteroids], 'name'),
      invokeMap([planets, moons, asteroids, comets, dwarfPlanets], 'name')
    )
    edgeDefs = gg._edgeDefinitions(lineageRel)

    gg._drop(ssGraph)
  } catch (e) {
    if (e.errorNum !== ARANGO_ERRORS.ERROR_GRAPH_NOT_FOUND.code) {
      console.error(e.message, e.stack)
    }
  } finally {
    const g = gg._create(ssGraph, edgeDefs)

    message = `Created graph ${ssGraph}`
    console.log(message)
    results.messages.push(message)

    results.graphs.push(ssGraph)
    results.vertexCollections = invokeMap(g._vertexCollections(), 'name')
    results.edgeCollections = invokeMap(g._edgeCollections(), 'name')

    results.cyGraphs.eventLog = loadCy([events, commands, snapshots, snapshotLinks, evtSSLinks])
    results.cyGraphs.skeleton = loadCy([skeletonEdgeHubs, skeletonEdgeSpokes, skeletonVertices])
  }

  console.log('Milestones: %o', results.milestones)

  return results
}
