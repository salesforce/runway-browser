"use strict";

let GlobalEnvironment = require('./environment.js').GlobalEnvironment;
let Input = require('./input.js');
let compiler = require('./compiler.js');
let fs = require('fs');

let readFile = (filename) => fs.readFileSync(filename).toString();

let run = function(code) {
  let prelude = compiler.loadPrelude(readFile('prelude.model'));
  let env = new GlobalEnvironment(prelude.env);
  let module = compiler.load(new Input('unit test', code), env);
  let context = {};
  module.ast.execute(context);
  return module;
};

module.exports = {
  run: run,
};
