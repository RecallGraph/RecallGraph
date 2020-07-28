'use strict'

module.exports = function (grunt) {
  grunt.registerTask('sonar', 'Run the Sonar Scanner and upload the results.', function () {
    const { command, options } = grunt.config(this.name)
    const optArr = Object.entries(options).map(entry => entry.join('='))
    const task = ['exec', command, optArr].flat().join(':')

    try {
      grunt.log.writeln('Initiating Sonar Scanner...')
      grunt.task.run(task)
    } catch (e) {
      grunt.log.error(e)
    }
  })
}
