'use strict'

module.exports = function (grunt) {
  grunt.registerTask('runTests', 'Run tests on the installed service.', function () {
    const { command, options, args } = grunt.config(this.name)
    const optArr = Object.entries(options).map(entry => entry.join(' '))

    let files = grunt.option('files')
    if (files) {
      files = JSON.parse(files)
    }
    const reporter = grunt.option('reporter')
    const grep = grunt.option('grep')

    args.push(`'${JSON.stringify({ files, reporter, grep }).replace(/:/g, '\\:')}'`)

    const task = ['exec', command, optArr, args].flat().join(':')

    try {
      grunt.log.writeln('Running tests...')
      grunt.task.run(task)
    } catch (e) {
      grunt.log.error(e)
    }
  })
}
