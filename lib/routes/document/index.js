'use strict';

const createRouter = require('@arangodb/foxx/router');

const router = createRouter();
require('./create')(router);
// require('./replace')(router);


module.exports = router;