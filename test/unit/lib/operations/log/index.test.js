'use strict';

const { expect } = require('chai');
const { db, query, aql } = require('@arangodb');
const log = require('../../../../../lib/operations/log');
const {
  getSortingClause, getLimitClause, getReturnClause,
  getTimeBoundFilters
} = require('../../../../../lib/operations/log/helpers');
const init = require('../../../../helpers/init');
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers');
const { differenceWith, values, concat } = require('lodash');
const {
  getRandomSubRange, cartesian, testUngroupedEvents, getGroupingClauseForExpectedResultsQuery,
  getRandomGraphPathPattern, getNodeBraceSampleIds
} = require('../../../../helpers/logTestHelper');

const eventColl = db._collection(SERVICE_COLLECTIONS.events);
const originKeys = differenceWith(db._collections(), values(SERVICE_COLLECTIONS),
  (coll, svcCollName) => coll.name() === svcCollName).map(coll => `origin-${coll._id}`);
originKeys.push('origin');

describe('Log - DB Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return ungrouped events in DB scope for the root path, when no groupBy is specified',
    () => {
      const path = '/';
      const allEvents = log(path); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${originKeys}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(path, allEvents, expectedEvents);
    });

  it('should return grouped events in DB scope for the root path, when groupBy is specified',
    () => {
      const path = '/';

      const allEvents = log(path); //Ungrouped events in desc order by ctime.
      const timeRange = getRandomSubRange(allEvents);
      const since = [0, allEvents[timeRange[1]].ctime], until = [0, allEvents[timeRange[0]].ctime];
      const skip = [0, 1], limit = [0, 2];
      const sortType = [null, 'asc', 'desc'];
      const groupBy = ['node', 'collection', 'event'], countsOnly = [false, true];

      const combos = cartesian({ since, until, skip, limit, sortType, groupBy, countsOnly });
      combos.forEach(combo => {
        const eventGroups = log(path, combo);

        expect(eventGroups).to.be.an.instanceOf(Array);

        const { since: snc, until: utl, skip: skp, limit: lmt, sortType: st, groupBy: gb, countsOnly: co } = combo;
        const queryParts = [
          aql`
            for v in ${eventColl}
            filter v._key not in ${originKeys}
          `
        ];

        const timeBoundFilters = getTimeBoundFilters(snc, utl);
        timeBoundFilters.forEach(filter => queryParts.push(filter));

        queryParts.push(getGroupingClauseForExpectedResultsQuery(gb, co));
        queryParts.push(getSortingClause(st, gb, co));
        queryParts.push(getLimitClause(lmt, skp));
        queryParts.push(getReturnClause(st, gb, co));

        const query = aql.join(queryParts, '\n');
        const expectedEventGroups = db._query(query).toArray();

        expect(eventGroups, JSON.stringify(combo)).to.deep.equal(expectedEventGroups);
      });
    });
});

describe('Log - Graph Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return ungrouped events in Graph scope for a graph path, when no groupBy is specified',
    () => {
      const path = getRandomGraphPathPattern();

      const allEvents = log(path); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const sampleDataRefs = init.getSampleDataRefs();
      const sampleGraphCollNames = concat(sampleDataRefs.vertexCollections, sampleDataRefs.edgeCollections);
      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${originKeys}
          filter regex_split(e.meta._id, '/')[0] in ${sampleGraphCollNames}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(path, allEvents, expectedEvents);
    });

  it('should return grouped events in Graph scope for a graph path, when groupBy is specified',
    () => {
      const path = getRandomGraphPathPattern();

      const allEvents = log(path); //Ungrouped events in desc order by ctime.
      const timeRange = getRandomSubRange(allEvents);
      const since = [0, allEvents[timeRange[1]].ctime], until = [0, allEvents[timeRange[0]].ctime];
      const skip = [0, 1], limit = [0, 2];
      const sortType = [null, 'asc', 'desc'];
      const groupBy = ['node', 'collection', 'event'], countsOnly = [false, true];
      const sampleDataRefs = init.getSampleDataRefs();
      const sampleGraphCollNames = concat(sampleDataRefs.vertexCollections, sampleDataRefs.edgeCollections);

      const combos = cartesian({ since, until, skip, limit, sortType, groupBy, countsOnly });
      combos.forEach(combo => {
        const eventGroups = log(path, combo);

        expect(eventGroups).to.be.an.instanceOf(Array);

        const { since: snc, until: utl, skip: skp, limit: lmt, sortType: st, groupBy: gb, countsOnly: co } = combo;
        const queryParts = [
          aql`
            for v in ${eventColl}
            filter v._key not in ${originKeys}
            filter regex_split(v.meta._id, '/')[0] in ${sampleGraphCollNames}
          `
        ];

        const timeBoundFilters = getTimeBoundFilters(snc, utl);
        timeBoundFilters.forEach(filter => queryParts.push(filter));

        queryParts.push(getGroupingClauseForExpectedResultsQuery(gb, co));
        queryParts.push(getSortingClause(st, gb, co));
        queryParts.push(getLimitClause(lmt, skp));
        queryParts.push(getReturnClause(st, gb, co));

        const query = aql.join(queryParts, '\n');
        const expectedEventGroups = db._query(query).toArray();

        expect(eventGroups, JSON.stringify(combo)).to.deep.equal(expectedEventGroups);
      });
    });
});

describe('Log - Collection Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return ungrouped events in Collection scope for a collection path, when no groupBy is specified',
    () => {
      const sampleDataRefs = init.getSampleDataRefs();
      const testDataCollections = values(init.TEST_DATA_COLLECTIONS);
      const testCollNames = concat(sampleDataRefs.vertexCollections, sampleDataRefs.edgeCollections,
        testDataCollections);
      const sampleTestCollNames = testCollNames.slice(...getRandomSubRange(testCollNames));

      const path = (sampleTestCollNames.length > 1) ? `/c/{${sampleTestCollNames}}` : `/c/${sampleTestCollNames}`;

      const allEvents = log(path); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${originKeys}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(path, allEvents, expectedEvents);
    });

  it('should return grouped events in Collection scope for a collection path, when groupBy is specified',
    () => {
      const sampleDataRefs = init.getSampleDataRefs();
      const testDataCollections = values(init.TEST_DATA_COLLECTIONS);
      const testCollNames = concat(sampleDataRefs.vertexCollections, sampleDataRefs.edgeCollections,
        testDataCollections);
      const sampleTestCollNames = testCollNames.slice(...getRandomSubRange(testCollNames));

      const path = (sampleTestCollNames.length > 1) ? `/c/{${sampleTestCollNames}}` : `/c/${sampleTestCollNames}`;

      const allEvents = log(path); //Ungrouped events in desc order by ctime.
      const timeRange = getRandomSubRange(allEvents);
      const since = [0, allEvents[timeRange[1]].ctime], until = [0, allEvents[timeRange[0]].ctime];
      const skip = [0, 1], limit = [0, 2];
      const sortType = [null, 'asc', 'desc'];
      const groupBy = ['node', 'collection', 'event'], countsOnly = [false, true];

      const combos = cartesian({ since, until, skip, limit, sortType, groupBy, countsOnly });
      combos.forEach(combo => {
        const eventGroups = log(path, combo);

        expect(eventGroups).to.be.an.instanceOf(Array);

        const { since: snc, until: utl, skip: skp, limit: lmt, sortType: st, groupBy: gb, countsOnly: co } = combo;
        const queryParts = [
          aql`
            for v in ${eventColl}
            filter v._key not in ${originKeys}
            filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
          `
        ];

        const timeBoundFilters = getTimeBoundFilters(snc, utl);
        timeBoundFilters.forEach(filter => queryParts.push(filter));

        queryParts.push(getGroupingClauseForExpectedResultsQuery(gb, co));
        queryParts.push(getSortingClause(st, gb, co));
        queryParts.push(getLimitClause(lmt, skp));
        queryParts.push(getReturnClause(st, gb, co));

        const query = aql.join(queryParts, '\n');
        const expectedEventGroups = db._query(query).toArray();

        expect(eventGroups, JSON.stringify(combo)).to.deep.equal(expectedEventGroups);
      });
    });
});

describe('Log - Node Glob Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return ungrouped events in Node Glob scope for a node-glob path, when no groupBy is specified',
    () => {
      const sampleDataRefs = init.getSampleDataRefs();
      const testDataCollections = values(init.TEST_DATA_COLLECTIONS);
      const testCollNames = concat(sampleDataRefs.vertexCollections, sampleDataRefs.edgeCollections,
        testDataCollections);
      const sampleTestCollNames = testCollNames.slice(...getRandomSubRange(testCollNames));

      const path = (sampleTestCollNames.length > 1) ? `/ng/{${sampleTestCollNames}}/*` : `/ng/${sampleTestCollNames}/*`;

      const allEvents = log(path); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${originKeys}
          filter regex_split(e.meta._id, '/')[0] in ${sampleTestCollNames}
          sort e.ctime desc
        return keep(e,'_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(path, allEvents, expectedEvents);
    });

  it('should return grouped events in Node Glob scope for a node-glob path, when groupBy is specified',
    () => {
      const sampleDataRefs = init.getSampleDataRefs();
      const testDataCollections = values(init.TEST_DATA_COLLECTIONS);
      const testCollNames = concat(sampleDataRefs.vertexCollections, sampleDataRefs.edgeCollections,
        testDataCollections);
      const sampleTestCollNames = testCollNames.slice(...getRandomSubRange(testCollNames));

      const path = (sampleTestCollNames.length > 1) ? `/ng/{${sampleTestCollNames}}/*` : `/ng/${sampleTestCollNames}/*`;

      const allEvents = log(path); //Ungrouped events in desc order by ctime.
      const timeRange = getRandomSubRange(allEvents);
      const since = [0, allEvents[timeRange[1]].ctime], until = [0, allEvents[timeRange[0]].ctime];
      const skip = [0, 1], limit = [0, 2];
      const sortType = [null, 'asc', 'desc'];
      const groupBy = ['node', 'collection', 'event'], countsOnly = [false, true];

      const combos = cartesian({ since, until, skip, limit, sortType, groupBy, countsOnly });
      combos.forEach(combo => {
        const eventGroups = log(path, combo);

        expect(eventGroups).to.be.an.instanceOf(Array);

        const { since: snc, until: utl, skip: skp, limit: lmt, sortType: st, groupBy: gb, countsOnly: co } = combo;
        const queryParts = [
          aql`
            for v in ${eventColl}
            filter v._key not in ${originKeys}
            filter regex_split(v.meta._id, '/')[0] in ${sampleTestCollNames}
          `
        ];

        const timeBoundFilters = getTimeBoundFilters(snc, utl);
        timeBoundFilters.forEach(filter => queryParts.push(filter));

        queryParts.push(getGroupingClauseForExpectedResultsQuery(gb, co));
        queryParts.push(getSortingClause(st, gb, co));
        queryParts.push(getLimitClause(lmt, skp));
        queryParts.push(getReturnClause(st, gb, co));

        const query = aql.join(queryParts, '\n');
        const expectedEventGroups = db._query(query).toArray();

        expect(eventGroups, JSON.stringify(combo)).to.deep.equal(expectedEventGroups);
      });
    });
});

describe('Log - Node Brace Scope', () => {
  before(() => init.setup({ ensureSampleDataLoad: true }));

  after(init.teardown);

  it('should return ungrouped events in Node Brace scope for a node-brace path, when no groupBy is specified',
    () => {
      const { path, sampleIds } = getNodeBraceSampleIds();

      const allEvents = log(path); //Ungrouped events in desc order by ctime.

      expect(allEvents).to.be.an.instanceOf(Array);

      const expectedEvents = query`
        for e in ${eventColl}
          filter e._key not in ${originKeys}
          filter e.meta._id in ${sampleIds}
          sort e.ctime desc
        return keep(e, '_id', 'ctime', 'event', 'meta')
      `.toArray();

      testUngroupedEvents(path, allEvents, expectedEvents);
    });

  it('should return grouped events in Node Brace scope for a node-brace path, when groupBy is specified',
    () => {
      const { path, sampleIds } = getNodeBraceSampleIds();

      const allEvents = log(path); //Ungrouped events in desc order by ctime.
      const timeRange = getRandomSubRange(allEvents);
      const since = [0, allEvents[timeRange[1]].ctime], until = [0, allEvents[timeRange[0]].ctime];
      const skip = [0, 1], limit = [0, 2];
      const sortType = [null, 'asc', 'desc'];
      const groupBy = ['node', 'collection', 'event'], countsOnly = [false, true];

      const combos = cartesian({ since, until, skip, limit, sortType, groupBy, countsOnly });
      combos.forEach(combo => {
        const eventGroups = log(path, combo);

        expect(eventGroups).to.be.an.instanceOf(Array);

        const { since: snc, until: utl, skip: skp, limit: lmt, sortType: st, groupBy: gb, countsOnly: co } = combo;

        const queryParts = [
          aql` 
            for v in ${eventColl} 
            filter v._key not in ${originKeys} 
            filter v.meta._id in ${sampleIds} 
          `
        ];
        const timeBoundFilters = getTimeBoundFilters(snc, utl);
        timeBoundFilters.forEach(filter => queryParts.push(filter));

        queryParts.push(getGroupingClauseForExpectedResultsQuery(gb, co));
        queryParts.push(getSortingClause(st, gb, co));
        queryParts.push(getLimitClause(lmt, skp));
        queryParts.push(getReturnClause(st, gb, co));

        const query = aql.join(queryParts, '\n');
        const expectedEventGroups = db._query(query).toArray();

        expect(eventGroups, JSON.stringify(combo)).to.deep.equal(expectedEventGroups);
      });
    });
});