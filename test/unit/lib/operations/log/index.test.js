'use strict';

const { expect } = require('chai');
const { db, query, aql } = require('@arangodb');
const log = require('../../../../../lib/operations/log');
const { getGroupingClause, getSortingClause, getLimitClause, getReturnClause, getTimeBoundFilters } = require(
  '../../../../../lib/operations/log/helpers');
const init = require('../../../../helpers/init');
const { SERVICE_COLLECTIONS } = require('../../../../../lib/helpers');
const { range, findIndex, findLastIndex, differenceWith, values } = require('lodash');
const { getRandomSubRange, cartesian } = require('../../../../helpers/logTestHelper');

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

      expect(allEvents).to.deep.equal(expectedEvents);

      const timeRange = getRandomSubRange(allEvents),
        sliceRange = getRandomSubRange(range(1, timeRange[1] - timeRange[0]));
      const since = [0, allEvents[timeRange[1]].ctime], until = [0, allEvents[timeRange[0]].ctime];
      const skip = [0, sliceRange[0]], limit = [0, sliceRange[1]];
      const sortType = [null, 'asc', 'desc'], groupBy = [null], countsOnly = [false, true];
      const combos = cartesian({ since, until, skip, limit, sortType, groupBy, countsOnly });

      combos.forEach(combo => {
        const events = log(path, combo);

        expect(events).to.be.an.instanceOf(Array);

        const earliestTimeBoundIndex = combo.since ? findLastIndex(allEvents,
          { ctime: combo.since }) : allEvents.length - 1;
        const latestTimeBoundIndex = combo.until && findIndex(allEvents, { ctime: combo.until });

        const timeSlicedEvents = allEvents.slice(latestTimeBoundIndex, earliestTimeBoundIndex + 1);
        const sortedTimeSlicedEvents = (combo.sortType === 'asc') ? timeSlicedEvents.reverse() : timeSlicedEvents;

        //https://wiki.teamfortress.com/wiki/Horseless_Headless_Horsemann
        let slicedSortedTimeSlicedEvents, start = 0, end = 0;
        if (combo.limit) {
          start = combo.skip;
          end = start + combo.limit;
          slicedSortedTimeSlicedEvents = sortedTimeSlicedEvents.slice(start, end);
        }
        else {
          slicedSortedTimeSlicedEvents = sortedTimeSlicedEvents;
        }

        expect(events).to.deep.equal(slicedSortedTimeSlicedEvents);
      });
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

        if (gb !== 'collection') {
          queryParts.push(getGroupingClause(gb, co));
        }
        else {
          const groupingPrefix = 'collect collection = regex_split(v.meta._id, "/")[0]';

          let groupingSuffix;
          if (co) {
            groupingSuffix = 'with count into total';
          }
          else {
            groupingSuffix = 'into events = keep(v, \'_id\', \'ctime\', \'event\', \'meta\')';
          }
          queryParts.push(aql.literal(`${groupingPrefix} ${groupingSuffix}`));
        }
        queryParts.push(getSortingClause(st, gb, co));
        queryParts.push(getLimitClause(lmt, skp));
        queryParts.push(getReturnClause(st, gb, co));

        const query = aql.join(queryParts, '\n');
        const expectedEventGroups = db._query(query).toArray();

        expect(eventGroups, JSON.stringify(combo)).to.deep.equal(expectedEventGroups);
      });
    });
});