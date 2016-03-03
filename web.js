"use strict";

let jQuery = require('jquery');
window.jQuery = jQuery;

require('bootstrap-webpack');
let BootstrapMenu = require('bootstrap-menu');

let compiler = require('./compiler.js');
window.compiler = compiler;
let Simulator = require('./simulator.js').Simulator;
let GlobalEnvironment = require('./environment.js').GlobalEnvironment;
let Input = require('./input.js');

let _ = require('lodash');
//delete window._;

let errors = require('./errors.js');
let Tooltip = require('./web/tooltip.js');
let Util = require('./web/util.js');
let StateDump = require('./web/statedump.jsx');
let RuleControls = require('./web/rulecontrols.jsx');
let ExecutionView = require('./web/executionview.jsx');
let REPLView = require('./web/repl.jsx');
let Controller = require('./controller.js').Controller;

let preludeText = require('./prelude.model');

let queryString = require('querystring');
let getParams = queryString.parse(window.location.search.slice(1));

let React = require('react');
let ReactDOM = require('react-dom');

let babel = require('babel-standalone');

let useClock = getParams['clock'] && true;

let prelude = compiler.loadPrelude(preludeText, {
  clock: useClock,
});

let WorkerClient = require('./workerclient.js');
window.workerClient = new WorkerClient();

let meval = (text) => {
  let env = new GlobalEnvironment(prelude.env);
  let module = compiler.load(new Input('eval', text), env);
  let context = {
    clock: 0,
  };
  module.ast.execute(context);
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
  Changesets: require('./changesets.js'),
  lodash: _,
  Timeline: require('./web/timeline.jsx'),
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

class TextStateView {
  constructor(controller, elem, module) {
    this.name = 'TextStateView';
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
    this.name = 'HTMLStateView';
    this.controller = controller;
    this.elem = elem;
    this.module = module;
    this.component = ReactDOM.render(
      React.createElement(
        StateDump.StateDumpEnv,
        {
          env: this.module.env,
          controller: this.controller,
        }),
      this.elem[0]);
  }

  update(changes) {
    this.component.setState({changes: changes});
  }
}

let pageLoaded = new Promise((resolve, reject) => {
  jQuery(window).load(resolve);
});


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
    let context = {
      clock: 0,
    };
    module.ast.execute(context);
  } catch ( e ) {
    jQuery('#error').text(e);
    throw e;
  }
  let controller = new Controller(module);

  workerClient.load(preludeText, input);
  let simulator = new Simulator(module, controller);

  controller.errorHandler = (msg, e) => {
    console.log(msg);
    jQuery('#error').text(msg);
    throw e;
  };
  controller.resetHandler = () => {
    jQuery('#error').text('');
  };
  window.controller = controller;
  controller.views.push(
    new HTMLStateView(controller, jQuery('#state'), module));
  controller.views.push(
    new RuleControls(controller, jQuery('#rulecontrols')[0], module));
  controller.views.push(
    new ExecutionView(controller, jQuery('#execution')[0], module));
  controller.views.push(
    new REPLView(controller, jQuery('#repl')[0], module));

  let userView = results[1];
  if (userView !== null) {
    userView = new userView(controller, jQuery('#view #user')[0], module);
    Promise.resolve(userView).then(v => {
      if (v.name === undefined) {
        v.name = 'User';
      }
      controller.views.push(v);

      let viewWrapper = jQuery('#viewwrapper');
      let smallSide = v.bigView ? 1000 : 100;
      viewWrapper.mouseup(() => {
        let viewElem = jQuery('#view');
        let width = viewWrapper.width();
        let height = viewWrapper.height();
        console.log(`resize to ${width}, ${height}`);
        viewElem.width(width);
        viewElem.height(height);
        if (width < height) {
          height = height / width * smallSide;
          width = smallSide;
        } else {
          width = width / height * smallSide;
          height = smallSide;
        }
        // viewElem.attr('viewBox', ...) sets viewbox (lowercase) instead
        viewElem[0].setAttribute('viewBox',
          `0 0 ${width} ${height}`);
        v.update(['layout']);
      });
    });
  }

  let animate = false;
  let animating = false;
  let simulateId = undefined;
  let simulateStart = 0;

  let workerId = undefined;
  let nextWorkerId = 1;
  let startSimulating = () => {
    if (workerId === undefined &&
        (controller.workspace.cursor.execution.last().getEvent().clock <
         controller.workspace.clock + 2e5)) {
      workerId = nextWorkerId;
      nextWorkerId += 1;
      let thisWorkerId = workerId;
      workerClient.simulate().then(newEvents => {
        if (workerId !== thisWorkerId) {
          return;
        }
        workerId = undefined;
        if (newEvents.length > 0) {
          let startCursor = controller.workspace.cursor.execution.last();
          let cursor = startCursor;
          newEvents.forEach(event => {
            cursor = cursor.addEvent(event);
          });
          controller._updateViews(['execution']);
          startSimulating();
        }
      });
    }
  };
  
  controller.workspace.forked.sub(execution => {
    workerId = undefined;
    workerClient.reset(execution.last().getEvent())
      .then(startSimulating);
  });


  // 'simulateSpeed' is number of wall microseconds per simulated clock tick
  // (or equivalently, the "x" of slowdown).
  // For asynchronous models without clocks, steps are executed every 10ms of
  // simulation time.
  window.simulateSpeed = 100;
  let toggleAnimate = () => {
    let stop = () => {
      window.cancelAnimationFrame(simulateId);
      simulateId = undefined;
    };
    if (simulateId === undefined) {
      let draw = when => {
        simulateId = undefined;
        let elapsed = (when - simulateStart);
        simulateStart = when;
        //console.log('elapsed:', elapsed, 'ms');
        if (elapsed > 500) { // probably had another tab open
          console.log(`Too much time elapsed between animation ` +
            `frames: ${elapsed} ms`);
          elapsed = 0;
        }
        controller.workspace.advanceClock(elapsed * 1000 / window.simulateSpeed);
        let maxGen = controller.workspace.cursor.execution.last().getEvent().clock;
        if (controller.workspace.clock >= maxGen) {
          controller.workspace.setClock(maxGen);
        }
        startSimulating();
        simulateId = window.requestAnimationFrame(draw);
      };
      draw(simulateStart);
    } else {
      stop();
    }
  };
  jQuery('#simulate').change(toggleAnimate);
  let mapSimulateSpeed = fn => {
    window.simulateSpeed = _.clamp(fn(window.simulateSpeed), .1, 5000000);
    console.log(`replay speed set to ${window.simulateSpeed}x slowdown`);
  };
  jQuery('#slower').click(() => mapSimulateSpeed(s => s * 2));
  jQuery('#faster').click(() => mapSimulateSpeed(s => s / 2));
});
