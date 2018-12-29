'use strict';

const { expect } = require("chai");
const init = require('../../helpers/init');
const helpers = require('../../../lib/helpers');

describe('Helpers - snapshotInterval', () => {
  before(init.setup);

  after(init.teardown);

  it('should return a collection-specific snapshot interval', () => {
    const collName = init.TEST_DATA_COLLECTIONS.vertex;
    const snapshotInterval = helpers.snapshotInterval(collName);

    expect(snapshotInterval).to.equal(init.COLLECTION_SNAPSHPOT_INTERVAL);
  });

  it('should return the default snapshot interval', () => {
    const snapshotInterval = helpers.snapshotInterval('non-existent-collection');
    const defaultSnapshotInterval = module.context.service.configuration['snapshot-intervals']._default;

    expect(snapshotInterval).to.equal(defaultSnapshotInterval);
  });
});
