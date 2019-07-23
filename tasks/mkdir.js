'use strict'

module.exports = function (grunt) {
  grunt.registerTask('mkdir', 'Make a directory using "mkdirp".', function () {
    if (this.args.length > 0) {
      try {
        grunt.file.mkdir(...this.args)
        grunt.log.ok(`Created folder: ${this.args[0]}`)
      } catch (e) {
        grunt.log.error(e)
      }
    } else {
      grunt.log.error('No target provided.')
    }
  })
}
