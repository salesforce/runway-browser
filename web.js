"use strict";

let compiler = require('./compiler.js');
window.compiler = compiler;
let Environment = require('./environment.js');
let Input = require('./input.js');

let preludeText = require('./prelude.model');

let jQuery = require('./node_modules/jquery/dist/jquery.js');
window.jQuery = jQuery;

let Snap = require('./node_modules/snapsvg/dist/snap.svg.js');

let prelude = compiler.loadPrelude(preludeText);

let meval = (text) => {
  let env = new Environment(prelude.env);
  let module = compiler.load(new Input('eval', text), env);
  module.ast.execute();
};
window.meval = meval;

let fetchRemoteFile = (filename) => new Promise((resolve, reject) => {
    jQuery.ajax(filename, {
      dataType: 'text',
    }).then((text) => {
      resolve(new Input(filename, text));
    });
  });

let fetchRemoteModule = function(filename) {
  return fetchRemoteFile(filename)
    .then((input) => {
      let load = eval(`(function load(module) { ${input.getText()} })`);
      let module = {};
      load(module);
      return module.exports;
    });
};

meval('print 3 * 3;');

class Controller {
  constructor() {
    this.views = [];
  }
  stateChanged() {
    this.views.forEach((view) => view.update());
  }
}

class DefaultView {
  constructor(controller, elem, module) {
    this.controller = controller;
    this.elem = elem;
    this.module = module;
    this.update();
  }

  update() {
    let vars = this.module.env.vars;
    let output = Array.from(vars).map((kv) => `${kv[0]}: ${kv[1]}`)
      .join('\n');
    this.elem.text(output);
  }
}

let pageLoaded = new Promise((resolve, reject) => {
  jQuery(window).load(resolve);
});

Promise.all([
  fetchRemoteFile('tokenring.model'),
  fetchRemoteModule('tokenring.js'),
  pageLoaded,
]).then((results) => {
  let input = results[0];
  jQuery('#code').text(input.getText());
  let env = new Environment(prelude.env);
  let module = compiler.load(input, env);
  module.ast.execute();
  window.module = module;
  let controller = new Controller();
  controller.views.push(
    new DefaultView(controller, jQuery('#state'), module));

  let userView = results[1];
  controller.views.push(
    new userView(controller, Snap('#view'), module));
});
