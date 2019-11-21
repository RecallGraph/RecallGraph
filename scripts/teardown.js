'use strict'

const queues = require('@arangodb/foxx/queues')

// Teardown crons
try {
  const queue = queues.get('crons')
  // noinspection JSUnresolvedVariable
  const mount = module.context.mount
  const cronJob = 'updateSkeletonGraph'

  const stored = queue.all({
    name: cronJob,
    mount
  })

  stored.forEach(jobId => {
    const job = queue.get(jobId)

    console.log('Deleting stored job: %o', job)

    queue.delete(jobId)
  })

  queues.delete('crons')
} catch (e) {
  console.error(e)
}

console.log('Finished teardown.')
