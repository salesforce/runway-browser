"use strict";

let parser = require('./parser.js');
let Environment = require('./environment.js');
let Input = require('./input.js');
let makeStatement = require('./statements/factory.js').make;

let load = function(input, env) {
  let parsed = parser.parse(input);
  let ast = makeStatement(parsed, env);
  ast.typecheck();
  return {
    ast: ast,
    env: env,
  };
};

let loadPrelude = function(text) {
  let env = new Environment();
  return load(new Input('prelude.model', text), env);
};


module.exports = {
  load: load,
  loadPrelude: loadPrelude,
};
