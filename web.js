"use strict";

let jQuery = require('jquery');
window.jQuery = jQuery;

require('bootstrap-webpack');
let BootstrapMenu = require('bootstrap-menu');

let compiler = require('./compiler.js');
window.compiler = compiler;
let simulator = require('./simulator.js');
let GlobalEnvironment = require('./environment.js').GlobalEnvironment;
let Input = require('./input.js');

let Tooltip = require('./web/tooltip.js');
let Util = require('./web/util.js');
let StateDump = require('./web/statedump.js');
let RuleControls = require('./web/rulecontrols.jsx');

let preludeText = require('./prelude.model');

let queryString = require('querystring');

let React = require('react');
let ReactDOM = require('react-dom');

let babel = require('babel-standalone');

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
    }).done(text => {
      resolve(new Input(filename, text));
    }).fail((req, st, err) => {
      reject(err);
    });
  });

// exported to modules loaded at runtime
let requireModules = {
  'bootstrap-menu': BootstrapMenu,
  jquery: jQuery,
  React: React,
  ReactDOM: ReactDOM,
  StateDump: StateDump,
  Tooltip: Tooltip,
  Util: Util,
  fetchRemoteFile: fetchRemoteFile,
};
let pseudoRequire = function(module) {
  if (module in requireModules) {
    return requireModules[module];
  } else {
    throw Error(`Unknown module: ${module}`);
  }
};

let fetchRemoteModule = function(filename) {
  return fetchRemoteFile(filename)
    .then((input) => {
      let load = new Function('module', 'require', input.getText());
      let module = {};
      load(module, pseudoRequire);
      return module.exports;
    });
};

let fetchRemoteJSX = function(filename) {
  return fetchRemoteFile(filename)
    .then((input) => {
      let code = babel.transform(input.getText(), {
        presets: ['react'],
      }).code;
      let load = new Function('module', 'require', code);
      let module = {};
      load(module, pseudoRequire);
      return module.exports;
    });
};

class Controller {
  constructor(module) {
    this.module = module;
    this.views = [];
  }

  checkInvariants() {
    try {
      this.module.env.invariants.forEachLocal((invariant, name) => {
        invariant.check();
      });
    } catch ( e ) {
      let msg = `Failed invariant ${name}: ${e}`;
      console.log(msg);
      jQuery('#error').text(msg);
      throw e;
    }
  }

  tryChangeState(mutator) {
    mutator();
    this.checkInvariants();
    this.updateViews();
  }

  resetToStartingState() {
    this.tryChangeState(() => {
      console.log('reset');
      jQuery('#error').text('');
      this.module.env.vars.forEachLocal((mvar, name) => {
        mvar.assign(mvar.type.makeDefaultValue());
      });
      this.module.ast.execute(); // run global initialization code
    });
  }

  updateViews() {
    this.views.forEach(view => view.update());
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
    let output = Array.from(this.module.env.vars.list())
      .map(k => [k, this.module.env.vars.get(k)])
      .filter(kv => kv[1].isConstant !== true)
      .map(kv => `${kv[0]}: ${kv[1]}`)
      .join('\n');
    this.elem.text(output);
  }
}

class HTMLStateView {
  constructor(controller, elem, module) {
    this.controller = controller;
    this.elem = elem;
    this.module = module;
    this.update();
  }

  update() {
    let $ = jQuery;
    let output = Array.from(this.module.env.vars.list())
      .map(k => [k, this.module.env.vars.get(k)])
      .filter(kv => kv[1].isConstant !== true)
      .map(kv => {
        return `${kv[0]}: ${StateDump.toHTMLString(kv[1])}`;
      })
      .join('\n<br />\n');
    this.elem.html(output);
  }
}

let pageLoaded = new Promise((resolve, reject) => {
  jQuery(window).load(resolve);
});

let simulateId = undefined;

let getParams = queryString.parse(window.location.search.slice(1));
let basename = 'examples/toomanybananas/toomanybananas';
if ('model' in getParams) {
  basename = 'examples/' + getParams['model'];
}

Promise.all([
  fetchRemoteFile(basename + '.model'),
  fetchRemoteJSX(basename + '.jsx')
    .catch(err => {
      console.log(`Failed to get view file over HTTP: ${err}`);
      return null;
    }),
  pageLoaded,
]).then((results) => {
  let input = results[0];
  let env = new GlobalEnvironment(prelude.env);
  let module;
  try {
    module = compiler.load(input, env);
    window.module = module;
    module.ast.execute();
  } catch ( e ) {
    jQuery('#error').text(e);
    return;
  }
  let controller = new Controller(module);
  controller.views.push(
    new DefaultView(controller, jQuery('#state'), module));
  controller.views.push(
    new HTMLStateView(controller, jQuery('#state2'), module));
  controller.views.push(
    new RuleControls(controller, jQuery('#rulecontrols')[0], module));

  let userView = results[1];
  if (userView !== null) {
    userView = new userView(controller, jQuery('#view #user')[0], module);
    if (userView instanceof Promise) {
      userView.then(v => controller.views.push(v));
    } else {
      controller.views.push(userView);
    }
  }

  window.simulateSpeed = 500;
  jQuery('#simulate').change(() => {
    let stop = () => {
      window.clearTimeout(simulateId);
      simulateId = undefined;
    };
    if (simulateId === undefined) {
      let step = () => {
        simulateId = undefined;
        controller.tryChangeState(() => simulator(module));
        simulateId = setTimeout(step, window.simulateSpeed);
      };
      step();
    } else {
      stop();
    }
  });
  jQuery('#slower').click(() => {
    window.simulateSpeed = Math.min(2000, Math.max(window.simulateSpeed * 2, 10));
  });
  jQuery('#faster').click(() => {
    window.simulateSpeed = Math.max(window.simulateSpeed / 2, 5);
  });


  let viewWrapper = jQuery('#viewwrapper');
  let viewElem = jQuery('#view');
  viewWrapper.mouseup(() => {
    let width = viewWrapper.width();
    let height = viewWrapper.height();
    console.log(`resize to ${width}, ${height}`);
    viewElem.width(width);
    viewElem.height(height);
    if (width < height) {
      height = height / width * 100;
      width = 100;
    } else {
      width = width / height * 100;
      height = 100;
    }
    // viewElem.attr('viewBox', ...) sets viewbox (lowercase) instead
    viewElem[0].setAttribute('viewBox',
      `0 0 ${width} ${height}`);
    controller.updateViews();
  });
});
