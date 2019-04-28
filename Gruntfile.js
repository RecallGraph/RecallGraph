'use strict'

const dotenv = require('dotenv')

dotenv.config()

module.exports = function (grunt) {
  const buildId = grunt.option('buildId') || Date.now()

  grunt.log.subhead(`
    =========================
     Build ID: ${buildId}
    =========================
  `)

  grunt.initConfig({
    buildId,
    manifest: grunt.file.readJSON('manifest.json'),
    buildDir: `./build/${buildId}`,
    eslint: {
      src: ['main.js', 'lib', 'scripts', 'test/{unit,helpers,integration,travis}', 'Gruntfile.js', 'tasks'],
      options: {
        configFile: '.eslintrc.json',
        format: 'json',
        outputFile: './test/reports/eslint-report.json'
      }
    },
    copy: {
      lib: {
        files: [{
          expand: true,
          src: 'lib/**',
          dest: '<%= buildDir %>'
        }]
      },
      main: {
        files: [{
          expand: true,
          src: ['scripts/**', 'test/{unit,helpers,integration,resources}', 'LICENSE', 'main.js', 'manifest.json',
            'package.json', 'README.md'],
          dest: '<%= buildDir %>'
        }]
      }
    },
    clean: {
      build: ['build'],
      dist: ['dist']
    },
    bundle: {
      command: ['build', 'foxx', 'bundle'],
      options: {
        '--outfile': '../../dist/evstore-<%= manifest.version %>.zip'
      },
      flags: ['-f']
    },
    instrument: {
      command: ['root', 'npx', 'nyc', 'instrument'],
      flags: ['--produce-source-map', '--delete'],
      src: 'lib',
      dest: '<%= buildDir %>/<%= instrument.src %>'
    },
    sonar: {
      command: ['root', 'sonar-scanner'],
      options: {
        '-Dsonar.login': process.env.SONAR_LOGIN
      }
    },
    installSvcDeps: {
      command: ['build', 'npm', 'install'],
      options: {
        '--only': 'prod'
      },
      flags: ['--no-package-lock', '--no-audit']
    },
    exec: {
      root: {
        cmd: function (command, ...params) {
          return `${command} ${params.join(' ')}`
        }
      },
      build: {
        cwd: '<%= buildDir %>',
        cmd: function (command, ...params) {
          return `${command} ${params.join(' ')}`
        }
      }
    }
  })

  grunt.loadNpmTasks('gruntify-eslint')
  grunt.loadNpmTasks('grunt-exec')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadTasks('tasks')

  grunt.registerTask('analyze', ['eslint', 'exec:root:fossa:analyze', 'sonar'])
  grunt.registerTask('dist', ['copy:lib', 'copy:main', 'installSvcDeps', 'mkdir:dist', 'bundle'])
  // grunt.registerTask('test', ['instrument', 'copy:main', 'installSvcDeps'])
}
