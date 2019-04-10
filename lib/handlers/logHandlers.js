"use strict";

const logOp = require("../operations/log");
const { omit } = require("lodash");

function log(req) {
  const options = omit(req.queryParams, "path");
  const path = req.queryParams.path || req.body.path;

  return logOp(path, options);
}

module.exports = {
  log
};
