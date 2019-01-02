'use strict';

const { db, query } = require('@arangodb');
const { forEach, get, mapValues } = require('lodash');
const fs = require('fs');
const { createSingle } = require('../lib/handlers/createHandlers');
const { replaceSingle } = require('../lib/handlers/replaceHandlers');

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
  let docCount = 0, insertCount = 0;
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
        console.error(e);
      }
    });
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${rawData.name()}`);

  //Remove footnote references from raw data
  let cursor = rawData.all();
  const footnoteRefPattern = /\[[0-9]+]/g;
  let replaceCount = 0;
  docCount = 0;
  while (cursor.hasNext()) {
    docCount++;
    const object = cursor.next();
    const newObj = mapValues(object, value => {
      if (typeof value === 'string') {
        return value.replace(footnoteRefPattern, '');
      }

      return value;
    });
    try {
      replaceSingle({ pathParams, body: newObj });
      replaceCount++;
    } catch (e) {
      console.error(e);
    }
  }
  module.exports.push(`Replaced ${replaceCount} out of ${docCount} documents in ${rawData.name()}`);

  //Populate stars
  cursor = rawData.byExample({ Type: 'star' });
  docCount = insertCount = 0;
  pathParams = {
    collection: stars.name()
  };
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();
    delete obj._source;
    delete obj._key;
    obj._rawRef = obj._id;

    try {
      createSingle({ pathParams, body: obj });
      insertCount++;
    } catch (e) {
      console.error(e);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${stars.name()}`);

  //Populate planets
  docCount = insertCount = 0;
  const sun = stars.firstExample({ Body: 'Sun' });
  cursor = query`
  for d in fulltext(${rawData}, 'Type', 'complete:planet,-dwarf')
    return d
`;
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();
    delete obj._source;
    delete obj._key;
    obj._rawRef = obj._id;

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

      insertCount++;
    } catch (e) {
      console.error(e);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${planets.name()}`);

  //Populate dwarf planets
  docCount = insertCount = 0;
  cursor = query`
  for d in fulltext(${rawData}, 'Type', 'complete:dwarf planet')
    return d
`;
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();
    delete obj._source;
    delete obj._key;
    obj._rawRef = obj._id;

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

      insertCount++;
    } catch (e) {
      console.error(e);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${dwarfPlanets.name()}`);

  //Populate asteroids
  docCount = insertCount = 0;
  cursor = query`
  for d in fulltext(${rawData}, 'Type', 'complete:asteroid')
    return d
`;
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();
    delete obj._source;
    delete obj._key;
    obj._rawRef = obj._id;

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

      insertCount++;
    } catch (e) {
      console.error(e);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${asteroids.name()}`);

  //Populate comets
  docCount = insertCount = 0;
  cursor = query`
    for d in fulltext(${rawData}, 'Type', 'complete:comet')
      return d
  `;
  while (cursor.hasNext()) {
    docCount++;
    const obj = cursor.next();
    delete obj._source;
    delete obj._key;
    obj._rawRef = obj._id;

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

      insertCount++;
    } catch (e) {
      console.error(e);
    }
  }
  module.exports.push(`Inserted ${insertCount} out of ${docCount} documents into ${comets.name()}`);
}