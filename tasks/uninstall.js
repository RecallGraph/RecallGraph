'use strict'

module.exports = function (grunt) {
  grunt.registerTask('uninstall', 'Uninstall the service from a database from the "build" folder.', function () {
    const { command, options, args } = grunt.config(this.name)
    const optArr = Object.entries(options).map(entry => entry.join(' '))
    const task = ['exec', command, optArr, args].flat().join(':')

    try {
      grunt.log.writeln('Uninstalling service...')
      grunt.task.run(task)
    } catch (e) {
      grunt.log.error(e)
    }
  })
}
