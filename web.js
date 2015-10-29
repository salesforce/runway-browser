"use strict";

let compiler = require('./compiler.js');
let Environment = require('./environment.js');
let Input = require('./input.js');

let meval = (text) => {
  let module = compiler.load(new Input('eval', text), new Environment());
  module.ast.execute();
};

meval('print 3 * 3;');

window.compiler = compiler;
window.Environment = Environment;
window.Input = Input;
window.meval = meval;

