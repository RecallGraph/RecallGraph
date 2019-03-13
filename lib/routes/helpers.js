'use strict';

const { chain } = require('lodash');

exports.getCRUDErrors = function getCRUDErrors(result) {
  return chain(result)
    .map('errorNum')
    .compact()
    .countBy()
    .map((val, key) => `${key}:${val}`)
    .join()
    .value();
};