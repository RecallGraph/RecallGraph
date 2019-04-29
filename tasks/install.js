'use strict'

module.exports = function (grunt) {
  grunt.registerTask('install', 'Install the service to a database from the "build" folder.', function () {
    const { command, options, args } = grunt.config(this.name)
    const optArr = Object.entries(options).map(entry => entry.join(' '))
    const task = ['exec', command, optArr, args].flat().join(':')

    try {
      grunt.log.writeln('Installing service...')
      grunt.task.run(task)
    } catch (e) {
      grunt.log.error(e)
    }
  })
}
