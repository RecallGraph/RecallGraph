'use strict';

const { chain } = require('lodash');

exports.getErrors = function getErrors(result) {
  return chain(result)
    .map('errorNum')
    .compact()
    .countBy()
    .map((val, key) => `${key}:${val}`)
    .join()
    .value();
};