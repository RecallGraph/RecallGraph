'use strict';

const joi = require('joi');
const { log } = require('../../handlers/logHandlers');
const { makeRe } = require('minimatch');
const {
  getDBScope, getGraphScope, getCollectionScope, getNodeGlobScope, getNodeBraceScope
} = require('../../operations/log/helpers');

const dbSchema = joi.string().regex(makeRe(getDBScope().pathPattern));
const graphSchema = joi.string().regex(makeRe(getGraphScope().pathPattern));
const collSchema = joi.string().regex(makeRe(getCollectionScope().pathPattern));
const nodeGlobSchema = joi.string().regex(makeRe(getNodeGlobScope().pathPattern));
const nodeBraceSchema = joi.string().regex(makeRe(getNodeBraceScope().pathPattern));

const pathSchema = joi.alternatives()
  .try(dbSchema, graphSchema, collSchema, nodeGlobSchema, nodeBraceSchema).required();

module.exports = (router) => {
  const pathDesc = 'The path pattern to pick nodes whose logs should be returned.';
  const reqBodySchema = joi.object().keys({ path: pathSchema });

  buildEndpoint(router.get('/log', processLogRequest, 'logGet'))
    .queryParam('path', pathSchema, pathDesc)
    .summary('Get event logs (path param in query).');

  buildEndpoint(router.post('/log', processLogRequest, 'logPost'))
    .body(reqBodySchema, pathDesc)
    .summary('Get event logs (path param in body).');

  console.log('Loaded "log" routes');
};

function processLogRequest(req, res) {
  res.status(200).json(log(req));
}

function buildEndpoint(endpoint) {
  return endpoint
    .queryParam('since', joi.number().precision(5).optional(),
      'The unix timestamp (sec) starting from which to return events. Precision: 10μs. Example: since=1547560124.43204')
    .queryParam('until', joi.number().precision(5).optional(),
      'The unix timestamp (sec) until which to return events. Precision: 10μs. Example: since=1547560124.43204')
    .queryParam('skip', joi.number().integer().min(0).optional(),
      'The number records to skip/omit from the result set, starting from the first. Falsey or missing implies none.')
    .queryParam('limit', joi.number().integer().min(0).optional(),
      'The number records to keep in the result set, starting from "skip"/0. Falsey or missing implies all.')
    .queryParam('sortType', joi.string().valid('asc', 'desc').optional(),
      'The sort order of records in the result set, sorted by "event.ctime" or aggregated "total". For grouped,' +
      ' non-aggregated results, the sort order works on each group\'s respective contents. The groups themselves,' +
      ' when present, are always sorted in natural ascending order.')
    .queryParam('groupBy', joi.string().valid('node', 'collection', 'event').optional(),
      'The parameter on which to group records in the result set.')
    .queryParam('countsOnly', joi.boolean().optional(),
      'If "groupBy" is specified, this parameter determines whether to return aggregated event totals' +
      ' (countsOnly=true), or entire event lists per group (countsOnly=false).')
    .response(200, ['application/json'], 'The log was successfully generated.')
    .error(500, 'The operation failed.')
    .description('Returns event logs for nodes matching the given path pattern.');
}

//