'use strict';

const { expect } = require('chai');
const init = require('../../../../helpers/init');
const request = require('@arangodb/request');
const { baseUrl } = module.context;
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers');
const { isObject, concat, defaults, omitBy, isNil } = require('lodash');
const {
  ORIGIN_KEYS, testUngroupedEvents, testGroupedEvents, getRandomGraphPathPattern, getSampleTestCollNames,
  getNodeBraceSampleIds
} = require('../../../../helpers/logTestHelpers');
const { db, query, aql } = require('@arangodb');

const eventColl = db._collection(SERVICE_COLLECTIONS.events);

describe('Routes - log (Path as query param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified',
    () => {
      const reqParams = {
        json: true,
        qs: {
          path: '/'
        }
      };
      const allEvents = logWrapper(reqParams); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${ORIGIN_KEYS}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(reqParams, allEvents, expectedEvents, logWrapper);
    });

  it('should return grouped events in DB scope for the root path, when groupBy is specified',
    () => {
      const reqParams = {
        json: true,
        qs: {
          path: '/'
        }
      };

      testGroupedEvents('database', reqParams, logWrapper);
    });

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified',
    () => {
      const reqParams = {
        json: true,
        qs: {
          path: getRandomGraphPathPattern()
        }
      };

      const allEvents = logWrapper(reqParams); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const sampleDataRefs = init.getSampleDataRefs();
      const sampleGraphCollNames = concat(sampleDataRefs.vertexCollections, sampleDataRefs.edgeCollections);
      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${ORIGIN_KEYS}
          filter regex_split(e.meta._id, '/')[0] in ${sampleGraphCollNames}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(reqParams, allEvents, expectedEvents, logWrapper);
    });

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified',
    () => {
      const reqParams = {
        json: true,
        qs: {
          path: getRandomGraphPathPattern()
        }
      };

      return testGroupedEvents('graph', reqParams, logWrapper);
    });

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified',
    () => {
      const sampleTestCollNames = getSampleTestCollNames();
      const path = (sampleTestCollNames.length > 1) ? `/c/{${sampleTestCollNames}}` : `/c/${sampleTestCollNames}`;
      const reqParams = {
        json: true,
        qs: { path }
      };
      const allEvents = logWrapper(reqParams); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${ORIGIN_KEYS}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(reqParams, allEvents, expectedEvents, logWrapper);
    });

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified',
    () => {
      const sampleTestCollNames = getSampleTestCollNames();
      const path = (sampleTestCollNames.length > 1) ? `/c/{${sampleTestCollNames}}` : `/c/${sampleTestCollNames}`;
      const reqParams = {
        json: true,
        qs: { path }
      };
      const queryParts = [
        aql`
          for v in ${eventColl}
          filter v._key not in ${ORIGIN_KEYS}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
        `
      ];

      testGroupedEvents('collection', reqParams, logWrapper, queryParts);
    });

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified',
    () => {
      const sampleTestCollNames = getSampleTestCollNames();
      const path = (sampleTestCollNames.length > 1) ? `/ng/{${sampleTestCollNames}}/*` : `/ng/${sampleTestCollNames}/*`;
      const reqParams = {
        json: true,
        qs: { path }
      };
      const allEvents = logWrapper(reqParams); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${ORIGIN_KEYS}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e,'_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(reqParams, allEvents, expectedEvents, logWrapper);
    });

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames();
    const path = (sampleTestCollNames.length > 1) ? `/ng/{${sampleTestCollNames}}/*` : `/ng/${sampleTestCollNames}/*`;
    const reqParams = {
      json: true,
      qs: { path }
    };
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter v._key not in ${ORIGIN_KEYS}
        filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
      `
    ];

    testGroupedEvents('nodeGlob', reqParams, logWrapper, queryParts);
  });

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified',
    () => {
      const { path, sampleIds } = getNodeBraceSampleIds();
      const reqParams = {
        json: true,
        qs: { path }
      };
      const allEvents = logWrapper(reqParams); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${ORIGIN_KEYS}
          filter e.meta._id in ${sampleIds}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(reqParams, allEvents, expectedEvents, logWrapper);
    });

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified',
    () => {
      const { path, sampleIds } = getNodeBraceSampleIds(100);
      const reqParams = {
        json: true,
        qs: { path }
      };
      const queryParts = [
        aql`
          for v in ${eventColl}
          filter v._key not in ${ORIGIN_KEYS}
          filter v.meta._id in ${sampleIds}
        `
      ];

      testGroupedEvents('nodeBrace', reqParams, logWrapper, queryParts);
    });
});

describe('Routes - log (Path as body param)', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified',
    () => {
      const reqParams = {
        json: true,
        body: {
          path: '/'
        }
      };
      const allEvents = logWrapperPost(reqParams); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${ORIGIN_KEYS}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(reqParams, allEvents, expectedEvents, logWrapperPost);
    });

  it('should return grouped events in DB scope for the root path, when groupBy is specified',
    () => {
      const reqParams = {
        json: true,
        body: {
          path: '/'
        }
      };

      testGroupedEvents('database', reqParams, logWrapperPost);
    });

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified',
    () => {
      const reqParams = {
        json: true,
        body: {
          path: getRandomGraphPathPattern()
        }
      };

      const allEvents = logWrapperPost(reqParams); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const sampleDataRefs = init.getSampleDataRefs();
      const sampleGraphCollNames = concat(sampleDataRefs.vertexCollections, sampleDataRefs.edgeCollections);
      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${ORIGIN_KEYS}
          filter regex_split(e.meta._id, '/')[0] in ${sampleGraphCollNames}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(reqParams, allEvents, expectedEvents, logWrapperPost);
    });

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified',
    () => {
      const reqParams = {
        json: true,
        body: {
          path: getRandomGraphPathPattern()
        }
      };

      return testGroupedEvents('graph', reqParams, logWrapperPost);
    });

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified',
    () => {
      const sampleTestCollNames = getSampleTestCollNames();
      const path = (sampleTestCollNames.length > 1) ? `/c/{${sampleTestCollNames}}` : `/c/${sampleTestCollNames}`;
      const req = {
        json: true,
        body: { path }
      };
      const allEvents = logWrapperPost(req); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${ORIGIN_KEYS}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(req, allEvents, expectedEvents, logWrapperPost);
    });

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified',
    () => {
      const sampleTestCollNames = getSampleTestCollNames();
      const path = (sampleTestCollNames.length > 1) ? `/c/{${sampleTestCollNames}}` : `/c/${sampleTestCollNames}`;
      const reqParams = {
        json: true,
        body: { path }
      };
      const queryParts = [
        aql`
          for v in ${eventColl}
          filter v._key not in ${ORIGIN_KEYS}
          filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
        `
      ];

      testGroupedEvents('collection', reqParams, logWrapperPost, queryParts);
    });

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified',
    () => {
      const sampleTestCollNames = getSampleTestCollNames();
      const path = (sampleTestCollNames.length > 1) ? `/ng/{${sampleTestCollNames}}/*` : `/ng/${sampleTestCollNames}/*`;
      const req = {
        json: true,
        body: { path }
      };
      const allEvents = logWrapperPost(req); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);
      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${ORIGIN_KEYS}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e,'_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(req, allEvents, expectedEvents, logWrapperPost);
    });

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified', () => {
    const sampleTestCollNames = getSampleTestCollNames();
    const path = (sampleTestCollNames.length > 1) ? `/ng/{${sampleTestCollNames}}/*` : `/ng/${sampleTestCollNames}/*`;
    const reqParams = {
      json: true,
      body: { path }
    };
    const queryParts = [
      aql`
        for v in ${eventColl}
        filter v._key not in ${ORIGIN_KEYS}
        filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
      `
    ];

    testGroupedEvents('nodeGlob', reqParams, logWrapperPost, queryParts);
  });

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified',
    () => {
      const { path, sampleIds } = getNodeBraceSampleIds();
      const reqParams = {
        json: true,
        body: { path }
      };
      const allEvents = logWrapperPost(reqParams); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${ORIGIN_KEYS}
          filter e.meta._id in ${sampleIds}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(reqParams, allEvents, expectedEvents, logWrapperPost);
    });

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified',
    () => {
      const { path, sampleIds } = getNodeBraceSampleIds();
      const reqParams = {
        json: true,
        body: { path }
      };
      const queryParts = [
        aql`
          for v in ${eventColl}
          filter v._key not in ${ORIGIN_KEYS}
          filter v.meta._id in ${sampleIds}
        `
      ];

      testGroupedEvents('nodeBrace', reqParams, logWrapperPost, queryParts);
    });
});

function logWrapper(reqParams, combo, method = 'get') {
  defaults(reqParams, { qs: {} });

  if (isObject(combo)) {
    Object.assign(reqParams.qs, omitBy(combo, isNil));
  }

  const response = request[method](`${baseUrl}/event/log`, reqParams);

  expect(response).to.be.an.instanceOf(Object);
  expect(response.statusCode, JSON.stringify({ reqParams, response })).to.equal(200);

  return JSON.parse(response.body);
}

function logWrapperPost(reqParams, combo) {
  return logWrapper(reqParams, combo, 'post');
}