'use strict'

module.exports = function (grunt) {
  grunt.registerTask('checkCoverage', 'Check coverage report against thresholds.', function () {
    const { command, options } = grunt.config(this.name)
    const optArr = Object.entries(options).map(entry => entry.join('='))
    const task = ['exec', command, optArr].flat().join(':')

    try {
      grunt.log.writeln('Checking Coverage...')
      grunt.task.run(task)
    } catch (e) {
      grunt.log.error(e)
    }
  })
}
