#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');

const input = [];
const rl = readline.createInterface({
  input: process.stdin
});

rl.on('line', function (line) {
  input.push(line);
});

rl.on('close', function () {
  const jsonStr = input.slice(1).join('\n');
  const json = JSON.parse(jsonStr);

  const result = json.result;
  console.log(JSON.stringify(result, null, 2));

  const exitCode = Math.sign(result.stats.failures);
  if (exitCode === 0) {
    const outfile = `./.nyc_output/out.json`;
    fs.writeFileSync(outfile, JSON.stringify(json.coverage, null, 2));

    console.log(`Piped coverage output to ${outfile}`);
  }

  process.exit(exitCode);
});