'use strict';

const createRouter = require('@arangodb/foxx/router');
const path = require('path');
const fs = require('fs');

const router = createRouter();
module.context.use(router);

const routes = fs.list(`${__dirname}/lib/routes`);
routes.forEach(route => {
  const mountPath = path.basename(route, '.js');
  const childRouter = require(`./lib/routes/${route}`);
  router.use(`/${mountPath}`, childRouter);
});