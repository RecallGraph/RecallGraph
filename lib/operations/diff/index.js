'use strict';

const { isPersistedEvent, isSameTrack } = require('./helpers');

module.exports = function diff(fromObj, toObj, collapse = false) {
  const fromObjIsEvent = isPersistedEvent(fromObj);
  const toObjIsEvent = isPersistedEvent(toObj);

  if (fromObjIsEvent && toObjIsEvent) {
    const ist = isSameTrack(fromObj, toObj);
    if (ist) {
      return diffSameTrackEvents(fromObj, toObj, collapse);
    }
  }
};

function diffSameTrackEvents(fromEvent, toEvent, collapse) {
}