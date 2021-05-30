#!/usr/bin/env node

const readline = require('readline')
const fs = require('fs')
const crypto = require('crypto')

const input = []
const rl = readline.createInterface({
  input: process.stdin
})

rl.on('line', function (line) {
  input.push(line)
})

rl.on('close', function () {
  const jsonStr = input.slice(1).join('\n')
  const json = JSON.parse(jsonStr)

  const result = json.result
  console.log(JSON.stringify(result.stats, null, 2))

  const exitCode = Math.sign(result.stats.failures)
  const resultCode = (exitCode === 0) ? 'passed' : 'failed'

  const hash = crypto.createHash('sha256')
  hash.update(process.env.FILES)
  hash.update(process.env.GREP)
  hash.update(process.env.ARANGODB_VERSION)
  hash.update(process.env.GITHUB_RUN_ID)
  hash.update(process.env.GITHUB_RUN_NUMBER)

  const nycOut = hash.digest()
  let outfile = `./test/reports/report-${nycOut}-${resultCode}.json`
  fs.writeFileSync(outfile, JSON.stringify(result, null, 2))
  console.log(`Piped test report to ${outfile}`)

  if (exitCode === 0) {
    outfile = `./.nyc_output/coverage-${nycOut}.json`
    fs.writeFileSync(outfile, JSON.stringify(json.coverage, null, 2))

    console.log(`Piped coverage output to ${outfile}`)
  }

  process.exit(exitCode)
})
