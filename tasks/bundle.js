'use strict'

module.exports = function (grunt) {
  grunt.registerTask('bundle', 'Create a zip bundle of the service in the "dist" folder.', function () {
    const { command, options, flags } = grunt.config(this.name)
    const optArr = Object.entries(options).map(entry => entry.join('='))
    const task = ['exec', command, flags, optArr].flat().join(':')

    try {
      grunt.log.writeln('Creating distribution bundle...')
      grunt.task.run(task)
    } catch (e) {
      grunt.log.error(e)
    }
  })
}
