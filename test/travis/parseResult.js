#!/usr/bin/env node

const readline = require('readline');

const input = [];
const rl = readline.createInterface({
  input: process.stdin
});

rl.on('line', function (line) {
  input.push(line);
});

rl.on('close', function () {
  const result = input.slice(1).join('\n');
  console.log(result);

  const json = JSON.parse(result);
  process.exit(Math.sign(json.pop()[1].failures));
});