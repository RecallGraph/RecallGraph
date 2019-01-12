'use strict';

const { expect } = require('chai');
const init = require('../../helpers/init');
const { snapshotInterval } = require('../../../lib/helpers');

describe('Helpers - snapshotInterval', () => {
  before(init.setup);

  after(init.teardown);

  it('should return a collection-specific snapshot interval', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const ssInterval = snapshotInterval(collName);

    expect(ssInterval).to.equal(init.TEST_DATA_COLLECTION_SNAPSHPOT_INTERVAL);
  });

  it('should return the default snapshot interval', () => {
    const ssInterval = snapshotInterval('non-existent-collection');
    const defaultSnapshotInterval = module.context.service.configuration['snapshot-intervals']._default;

    expect(ssInterval).to.equal(defaultSnapshotInterval);
  });
});
