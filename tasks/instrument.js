'use strict'

module.exports = function (grunt) {
  grunt.registerTask('instrument', 'Instrument relevant source files for coverage reports.', function () {
    const { command, flags = [], src, dest } = grunt.config(this.name)
    const task = ['exec', command, flags, src, dest].flat().join(':')

    try {
      grunt.log.writeln(`Instrumenting ${src} to ${dest}`)
      grunt.task.run(task)
    } catch (e) {
      grunt.log.error(e)
    }
  })
}
