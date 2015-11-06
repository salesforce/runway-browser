"use strict";

let compiler = require('./compiler.js');
let Environment = require('./environment.js');
let Input = require('./input.js');

let preludeText = require('./prelude.model');
let jQuery = require('./node_modules/jquery/dist/jquery.min.js');

let prelude = compiler.loadPrelude(preludeText);

let meval = (text) => {
  let env = new Environment(prelude.env);
  let module = compiler.load(new Input('eval', text), env);
  module.ast.execute();
};

let fetchRemoteFile = (filename) => new Promise((resolve, reject) => {
  jQuery.get(filename).then((text) => {
    resolve(new Input(filename, text));
  });
});

let updateStateDisplay = (module) => {
  let output = [...module.env.vars].map((kv) => `${kv[0]}: ${kv[1]}`).join('\n');
  jQuery('#state').text(output);
};



window.compiler = compiler;
window.Environment = Environment;
window.Input = Input;
window.meval = meval;
window.jQuery = jQuery;

meval('print 3 * 3;');

let controls = [
  ['deliver token', (rules) => rules['deliverToken'].fire()],
  ['pass token 1',  (rules) => rules['passToken'].fire(1)],
  ['pass token 2',  (rules) => rules['passToken'].fire(2)],
  ['pass token 3',  (rules) => rules['passToken'].fire(3)],
  ['pass token 4',  (rules) => rules['passToken'].fire(4)],
  ['pass token 5',  (rules) => rules['passToken'].fire(5)],
];

fetchRemoteFile('tokenring.model').then((input) => {
  jQuery('#code').text(input.getText());
  let env = new Environment(prelude.env);
  let module = compiler.load(input, env);
  window.module = module;
  updateStateDisplay(module);
  controls.forEach((kv) => {
    jQuery('#controls').append(
      jQuery('<li></li>').append(
        jQuery('<a href="#"></a>')
          .text(kv[0])
          .click(() => {
            kv[1](module.env.rules);
            updateStateDisplay(module);
            return false;
          })));
  });
});
