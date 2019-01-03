'use strict';

const { db, query } = require('@arangodb');
const { forEach, get, mapValues, isEqual } = require('lodash');
const fs = require('fs');
const { createSingle } = require('../lib/handlers/createHandlers');
const { replaceSingle } = require('../lib/handlers/replaceHandlers');
const { removeMultiple } = require('../lib/handlers/removeHandlers');

const argv = module.context.argv;
if (get(argv, [0, 'confirmTruncate']) !== true) {
  module.exports = 'Please set arg { "confirmTruncate": true } when running this script.';
} else {
  //Define collection metadata
  const sampleDataCollections = {
    rawData: {
      type: 'document',
      name: module.context.collectionName('test_raw_data')
    },
    stars: {
      type: 'document',
      name: module.context.collectionName('test_stars'),
      indexes: [
        {
          type: 'fulltext',
          fields: ['Type']
        }
      ]
    },
    planets: {
      type: 'document',
      name: module.context.collectionName('test_planets')
    },
    moons: {
      type: 'document',
      name: module.context.collectionName('test_moons')
    },
    asteroids: {
      type: 'document',
      name: module.context.collectionName('test_asteroids')
    },
    comets: {
      type: 'document',
      name: module.context.collectionName('test_comets')
    },
    dwarfPlanets: {
      type: 'document',
      name: module.context.collectionName('test_dwarf_planets')
    },
    lineage: {
      type: 'edge',
      name: module.context.collectionName('test_lineage')
    }
  };

  //Init Collections
  const colls = {};
  forEach(sampleDataCollections, (collInfo, key) => {
    let coll = db._collection(collInfo.name);
    if (!coll) {
      switch (collInfo.type) {
        case 'document':
          coll = db._createDocumentCollection(collInfo.name);

          break;

        case 'edge':
          coll = db._createEdgeCollection(collInfo.name);

          break;
      }
    }

    db._truncate(coll);
    get(collInfo, 'indexes', []).forEach(index => coll.ensureIndex(index));
    colls[key] = coll;
  });
  const { rawData, stars, planets, moons, asteroids, comets, dwarfPlanets, lineage } = colls;
  require('./truncate');

  //Init script output
  module.exports = [];

  //Load and insert raw data
  const resourcePath = 'test/resources';
  const dataPattern = /^SS_Objects_.+\.json$/;
  let docCount = 0, insertCount = 0, errorCount = 0;
  let pathParams = {
    collection: rawData.name()
  };
  fs.list(module.context.fileName(resourcePath))
    .filter(filename => dataPattern.test(filename))
    .map(filename => `../${resourcePath}/${filename}`)
    .forEach(fileName => {
      try {
        const jsonArr = require(fileName);
        jsonArr.forEach(jsonObj => {
          docCount++;
          jsonObj._source = fileName;
          createSingle({ pathParams, body: jsonObj });
          insertCount++;
        });
      } catch (e) {
        errorCount++;
        console.error(e);
      }
    });
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${rawData.name()} with ${errorCount} errors`);

  //Remove footnote references from raw data
  let cursor = rawData.all();
  const footnoteRefPattern = /\[[0-9]+]/g;
  let replaceCount = 0;
  docCount = errorCount = 0;
  while (cursor.hasNext()) {
    docCount++;
    const object = cursor.next();
    const newObj = mapValues(object, value => {
      if (typeof value === 'string') {
        return value.replace(footnoteRefPattern, '');
      }

      return value;
    });

    if (!isEqual(object, newObj)) {
      try {
        replaceSingle({ pathParams, body: newObj });
        replaceCount++;
      } catch (e) {
        errorCount++;
        console.error(e);
      }
    }
  }
  module.exports.push(`Replaced ${replaceCount} out of ${docCount} documents in ${rawData.name()} with ${errorCount} errors`);

  //Populate stars
  cursor = rawData.byExample({ Type: 'star' });
  docCount = insertCount = errorCount = 0;
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();
    try {
      pathParams = {
        collection: stars.name()
      };
      const star = createSingle({ pathParams, body: obj });

      pathParams = {
        collection: rawData.name()
      };
      obj._ref = star._id;
      replaceSingle({ pathParams, body: obj });

      insertCount++;
    } catch (e) {
      errorCount++;
      console.error(e);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${stars.name()} with ${errorCount} errors`);

  //Populate planets
  docCount = insertCount = errorCount = 0;
  const sun = stars.firstExample({ Body: 'Sun' });
  cursor = query`
  for d in fulltext(${rawData}, 'Type', 'planet,-dwarf')
  return d
`;
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();

    try {
      pathParams = {
        collection: planets.name()
      };
      const planet = createSingle({ pathParams, body: obj });

      const linEdge = {
        _from: sun._id,
        _to: planet._id
      };
      pathParams = {
        collection: lineage.name()
      };
      createSingle({ pathParams, body: linEdge });

      pathParams = {
        collection: rawData.name()
      };
      obj._ref = planet._id;
      replaceSingle({ pathParams, body: obj });

      insertCount++;
    } catch (e) {
      errorCount++;
      console.error(e);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${planets.name()} with ${errorCount} errors`);

  //Populate dwarf planets
  docCount = insertCount = errorCount = 0;
  cursor = query`
  for d in fulltext(${rawData}, 'Type', 'dwarf,|TNO,|plutino,|sednoid,|cubewano,|KBO,|SDO,|detached,|prefix:trans,|centaur,|twotino,|classical,|secondary')
  return d
`;
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();

    try {
      pathParams = {
        collection: dwarfPlanets.name()
      };
      const dwarfPlanet = createSingle({ pathParams, body: obj });

      const linEdge = {
        _from: sun._id,
        _to: dwarfPlanet._id
      };
      pathParams = {
        collection: lineage.name()
      };
      createSingle({ pathParams, body: linEdge });

      pathParams = {
        collection: rawData.name()
      };
      obj._ref = dwarfPlanet._id;
      replaceSingle({ pathParams, body: obj });

      insertCount++;
    } catch (e) {
      errorCount++;
      console.error(e);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${dwarfPlanets.name()} with ${errorCount} errors`);

  //Populate asteroids
  docCount = insertCount = errorCount = 0;
  cursor = query`
  for d in fulltext(${rawData}, 'Type', 'asteroid,|NEA,|trojan')
  return d
`;
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();

    try {
      pathParams = {
        collection: asteroids.name()
      };
      const asteroid = createSingle({ pathParams, body: obj });

      const linEdge = {
        _from: sun._id,
        _to: asteroid._id
      };
      pathParams = {
        collection: lineage.name()
      };
      createSingle({ pathParams, body: linEdge });

      pathParams = {
        collection: rawData.name()
      };
      obj._ref = asteroid._id;
      replaceSingle({ pathParams, body: obj });

      insertCount++;
    } catch (e) {
      errorCount++;
      console.error(e);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${asteroids.name()} with ${errorCount} errors`);

  //Populate comets
  docCount = insertCount = errorCount = 0;
  cursor = query`
    for d in fulltext(${rawData}, 'Type', 'comet')
    return d
  `;
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();

    try {
      pathParams = {
        collection: comets.name()
      };
      const comet = createSingle({ pathParams, body: obj });

      const linEdge = {
        _from: sun._id,
        _to: comet._id
      };
      pathParams = {
        collection: lineage.name()
      };
      createSingle({ pathParams, body: linEdge });

      pathParams = {
        collection: rawData.name()
      };
      obj._ref = comet._id;
      replaceSingle({ pathParams, body: obj });

      insertCount++;
    } catch (e) {
      errorCount++;
      console.error(e);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${comets.name()} with ${errorCount} errors`);

  //Populate moons
  docCount = insertCount = errorCount = 0;
  let warningCount = 0, failedMoonKeys = [];
  cursor = query`
    for m in fulltext(${rawData}, 'Type', 'prefix:moon,|prefix:satellite')
      let parent = concat(regex_replace(m.Type, '^.*([Mm]oon|[Ss]atellite)s? of ([0-9A-Za-z\\\\s]+);?.*$', '$2'), '%')
      let o = (
          for b in ${rawData}
          filter like(b.Body, parent)
          return b
      )
      collect moon = m into rawObjects = o[0]
  return {"moon": moon, "rawObject": rawObjects[0]}
  `;
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();
    if (obj.rawObject) {
      try {
        pathParams = {
          collection: moons.name()
        };
        const moon = createSingle({ pathParams, body: obj.moon });

        const linEdge = {
          _from: obj.rawObject._id,
          _to: moon._id
        };
        pathParams = {
          collection: lineage.name()
        };
        createSingle({ pathParams, body: linEdge });

        pathParams = {
          collection: rawData.name()
        };
        obj.moon._ref = obj.moon._ref ? [obj.moon._ref, moon._id] : moon._id;
        replaceSingle({ pathParams, body: obj.moon });

        insertCount++;
      } catch (e) {
        errorCount++;
        console.error(e);
      }
    } else {
      warningCount++;
      failedMoonKeys.push(obj.moon._key);
      console.warn(`No suitable parent object found for moon ${obj.moon._id}. Skipped.`);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${moons.name()} with ${errorCount} errors and ${warningCount} warnings`);

  //Cleanup raw data of entries copied to other collections
  errorCount = 0;
  docCount = rawData.count();
  let removeCount = 0;
  const rids = query`
    for r in evstore_test_raw_data
      filter has(r, '_ref') && r._key not in ${failedMoonKeys}
    return keep(r, '_key')
  `.toArray();

  pathParams = {
    collection: rawData.name()
  };
  const rnodes = removeMultiple({ pathParams, body: rids });
  rnodes.forEach(rnode => {
    if (rnode.errorNum) {
      errorCount++;
    } else {
      removeCount++;
    }
  });
  module.exports.push(`Removed ${removeCount} out of ${docCount} documents from ${rawData.name()} with ${errorCount} errors`);
}
