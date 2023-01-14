'use strict'

const dotenv = require('dotenv')

dotenv.config()

module.exports = function (grunt) {
  grunt.initConfig({
    manifest: grunt.file.readJSON('manifest.json'),
    buildDir: './build',
    eslint: {
      src: [
        'main.js',
        'lib',
        'scripts',
        'test/{unit,helpers,integration,travis}',
        'Gruntfile.js',
        'tasks'
      ],
      options: {
        configFile: '.eslintrc.json',
        format: 'json',
        outputFile: './test/reports/eslint-report.json'
      }
    },
    copy: {
      lib: {
        files: [
          {
            expand: true,
            src: 'lib/**/*.js',
            dest: '<%= buildDir %>'
          }
        ]
      },
      main: {
        files: [
          {
            expand: true,
            src: [
              'scripts/**',
              'assets/**',
              'test/{unit,helpers,integration,resources}/**',
              'LICENSE',
              'main.js',
              'manifest.json',
              'package.json',
              'README.md'
            ],
            dest: '<%= buildDir %>'
          }
        ]
      }
    },
    clean: {
      build: ['build'],
      dist: ['dist'],
      docs: ['docs']
    },
    uninstall: {
      command: ['build', 'foxx', 'uninstall'],
      options: {
        '--server': process.env.ARANGO_SERVER
      },
      args: [process.env.MOUNT_POINT]
    },
    install: {
      command: ['build', 'foxx', 'install'],
      options: {
        '--server': process.env.ARANGO_SERVER
      },
      args: [process.env.MOUNT_POINT]
    },
    replace: {
      command: ['build', 'foxx', 'replace'],
      options: {
        '--server': process.env.ARANGO_SERVER
      },
      args: [process.env.MOUNT_POINT]
    },
    bundle: {
      command: ['build', 'foxx', 'bundle'],
      options: {
        '--outfile': '../dist/RecallGraph-<%= manifest.version %>.zip'
      },
      flags: ['-f']
    },
    instrument: {
      command: ['root', 'npx', 'nyc', 'instrument'],
      flags: ['--delete'],
      src: 'lib',
      dest: '<%= buildDir %>/<%= instrument.src %>'
    },
    checkCoverage: {
      command: ['root', 'npx', 'nyc', 'check-coverage'],
      options: {
        '--lines': 80,
        '--functions': 80,
        '--branches': 70
      }
    },
    lcovReport: {
      command: ['root', 'npx', 'nyc', 'report'],
      options: {
        '--report-dir': './test/reports',
        '--reporter': 'lcovonly'
      }
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
        '--omit': 'dev'
      },
      flags: ['--no-package-lock', '--no-audit', '--prefer-offline']
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
      },
      runTests: {
        cmd: function (nofilters = false) {
          const reporter = 'suite'
          let files, grep

          if (!nofilters) {
            files = this.option('files')
            if (files) {
              files = JSON.parse(files)
            }
            grep = this.option('grep')
          }

          const params = `'${JSON.stringify({ files, grep, reporter })}'`

          return `foxx run --server ${process.env.ARANGO_SERVER} ${process.env.MOUNT_POINT} runTests ${params}`
        },
        options: {
          maxBuffer: 1073741824 // 1 MiB
        },
        stdout: false,
        callback: function (error, stdout) {
          if (error) {
            grunt.fatal(error)
          } else {
            const json = JSON.parse(stdout)

            const result = json.result
            grunt.log.writeln(JSON.stringify(result, null, 2))

            const exitCode = Math.sign(result.stats.failures)
            if (exitCode === 0) {
              if (json.coverage) {
                const outfile = './.nyc_output/out.json'
                grunt.file.write(outfile, JSON.stringify(json.coverage, null, 2))

                grunt.log.ok(`Piped coverage output to ${outfile}`)
              }
            } else {
              grunt.fatal('There were test failures', exitCode)
            }
          }
        }
      }
    }
  })

  grunt.loadNpmTasks('gruntify-eslint')
  grunt.loadNpmTasks('grunt-exec')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadTasks('tasks')

  grunt.registerTask('analyze', ['eslint', 'sonar'])
  grunt.registerTask('build', ['copy:lib', 'copy:main', 'installSvcDeps'])
  grunt.registerTask('initialize', ['build', 'uninstall', 'install'])
  grunt.registerTask('dist', ['build', 'mkdir:dist', 'bundle'])
  grunt.registerTask('test', ['build', 'replace', 'exec:runTests'])
  grunt.registerTask('testWithCoverage', [
    'instrument', 'copy:main', 'installSvcDeps', 'replace', 'exec:runTests:true',
    'checkCoverage', 'lcovReport'
  ])
}
