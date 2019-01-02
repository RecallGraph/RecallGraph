'use strict';

const { db, query, aql } = require('@arangodb');
const { SERVICE_COLLECTIONS, PATCH_TYPES, SORT_TYPES } = require('../../helpers');

const { events, commands, snapshots, evtSSLinks } = SERVICE_COLLECTIONS;


module.exports = function log(path, { patch = PATCH_TYPES.NONE, start = 0, end = 0, since, until, from, to, skip = 0, limit = 0, sort = SORT_TYPES.ASC }) {

};
