'use strict'

const { deleteSkeletonUpdateCron } = require('../lib/helpers')

// Teardown crons
deleteSkeletonUpdateCron()

console.log('Finished teardown.')
