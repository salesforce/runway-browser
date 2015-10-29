"use strict";

let fs = require('fs');
let Input = require('./input.js');
let parser = require('./parser.js');


if (require.main === module) {
  let filename = 'input.model';
  if (process.argv.length > 2) {
    filename = process.argv[2];
  }
  let text = fs.readFileSync(filename).toString();
  let parsed = parser.parse(new Input(filename, text));
  console.log(JSON.stringify(parsed, null, 2));
}
