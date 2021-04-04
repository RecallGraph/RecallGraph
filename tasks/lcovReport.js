'use strict'

module.exports = function (grunt) {
  grunt.registerTask('lcovReport', 'Prepare LCOV report.', function () {
    const { command, options } = grunt.config(this.name)
    const optArr = Object.entries(options).map(entry => entry.join('='))
    const task = ['exec', command, optArr].flat().join(':')

    try {
      grunt.log.writeln('Preparing LCOV Report...')
      grunt.task.run(task)
    } catch (e) {
      grunt.log.error(e)
    }
  })
}
