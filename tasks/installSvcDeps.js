'use strict'

module.exports = function (grunt) {
  grunt.registerTask('installSvcDeps', 'Install service-specific dependencies during a build.', function () {
    const { command, options, flags } = grunt.config(this.name)
    const optArr = Object.entries(options).map(entry => entry.join('='))
    const task = ['exec', command, flags, optArr].flat().join(':')

    try {
      grunt.log.writeln('Installing Service Dependencies...')
      grunt.task.run(task)
    } catch (e) {
      grunt.log.error(e)
    }
  })
}
