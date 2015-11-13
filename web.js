"use strict";

let compiler = require('./compiler.js');
window.compiler = compiler;
let simulator = require('./simulator.js');
let GlobalEnvironment = require('./environment.js').GlobalEnvironment;
let Input = require('./input.js');

let preludeText = require('./prelude.model');

let jQuery = require('./node_modules/jquery/dist/jquery.js');
window.jQuery = jQuery;

let Snap = require('./node_modules/snapsvg/dist/snap.svg.js');

let queryString = require('querystring');

let prelude = compiler.loadPrelude(preludeText);

let meval = (text) => {
  let env = new GlobalEnvironment(prelude.env);
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
    let output = Array.from(this.module.env.vars)
      .filter(kv => kv[1].isConstant !== true)
      .map(kv => `${kv[0]}: ${kv[1]}`)
      .join('\n');
    this.elem.text(output);
  }
}

let pageLoaded = new Promise((resolve, reject) => {
  jQuery(window).load(resolve);
});

let simulateId = undefined;

let getParams = queryString.parse(window.location.search.slice(1));
let basename = 'examples/tokenring';
if ('model' in getParams) {
  basename = 'examples/' + getParams['model'];
}

Promise.all([
  fetchRemoteFile(basename + '.model'),
  fetchRemoteModule(basename + '.js'),
  pageLoaded,
]).then((results) => {
  let input = results[0];
  jQuery('#code').text(input.getText());
  let env = new GlobalEnvironment(prelude.env);
  let module = compiler.load(input, env);
  module.ast.execute();
  window.module = module;
  let controller = new Controller();
  controller.views.push(
    new DefaultView(controller, jQuery('#state'), module));

  let userView = results[1];
  controller.views.push(
    new userView(controller, Snap('#view'), module));

  jQuery('#simulate').click(() => {
    if (simulateId === undefined) {
      let step = () => {
        simulator(module);
        controller.stateChanged();
      };
      step();
      simulateId = setInterval(step, 2000);
    } else {
      window.clearTimeout(simulateId);
      simulateId = undefined;
    }
    return false;
  });
});
