"use strict";

let parser = require('./parser.js');
let Environment = require('./environment.js').Environment;
let Input = require('./input.js');
let makeStatement = require('./statements/factory.js').make;
let NumberType = require('./types/number.js').Type;
let BlackHoleNumberType = require('./types/blackholenumber.js').Type;

let load = function(input, env) {
  let parsed = parser.parse(input);
  let ast = makeStatement(parsed, env);
  ast.typecheck();
  return {
    ast: ast,
    env: env,
  };
};

let loadPrelude = function(text, options) {
  if (options === undefined) {
    options = {};
  }
  let env = new Environment();
  let prelude = load(new Input('prelude.model', text), env);
  if (options.clock) {
    prelude.env.types.set('Time', NumberType.singleton);
  } else {
    prelude.env.types.set('Time', BlackHoleNumberType.singleton);
  }
  return prelude;
};


module.exports = {
  load: load,
  loadPrelude: loadPrelude,
};
