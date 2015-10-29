"use strict";

let compiler = require('./compiler.js');
let Environment = require('./environment.js');
let Input = require('./input.js');

let preludeText = require('./prelude.model');

let prelude = compiler.loadPrelude(preludeText);

let meval = (text) => {
  let env = new Environment(prelude.env);
  let module = compiler.load(new Input('eval', text), env);
  module.ast.execute();
};

meval('print 3 * 3;');

window.compiler = compiler;
window.Environment = Environment;
window.Input = Input;
window.meval = meval;

