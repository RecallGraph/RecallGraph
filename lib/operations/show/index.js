'use strict';

const { showByNidAndNRev, showByEid } = require('./helpers');

module.exports = function show({ eid, nid, nrev }) {
  if (eid) {
    return showByEid(eid);
  }
  else {
    return showByNidAndNRev(nid, nrev);
  }
};