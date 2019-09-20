// eslint-disable-next-line no-undef
db._createDatabase('evdb')

// noinspection NpmUsedModulesInstalled
const users = require('@arangodb/users')
users.save('evuser', 'evpasswd', true)
users.grantDatabase('evuser', 'evdb')
