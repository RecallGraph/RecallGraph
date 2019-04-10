db._createDatabase("evdb");

const users = require("@arangodb/users");
users.save("evuser", process.env.EVPASSWD, true);
users.grantDatabase("evuser", "evdb");
