"use strict";

let assert = require('assert');
let Environment = require('./environment.js');
let Input = require('./input.js');
let Parser = require('./parser.js');
let main = require('./main.js');

let run = function(code) {
  let prelude = main.loadPrelude();
  let env = new Environment(prelude);

  let parsed = Parser.parse(new Input('unit test', code));
  let module = main.load(parsed, env);
  module.ast.execute();
  return module;
};

module.exports = {
  run: run,
};
