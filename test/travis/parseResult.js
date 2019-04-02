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
  const json = JSON.parse(result).filter(item => ['fail', 'end'].includes(item[0]));

  console.log(JSON.stringify(json, null, 2));
  process.exit(Math.sign(json.pop()[1].failures));
});