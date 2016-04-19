"use strict";

let jQuery = require('jquery');
window.jQuery = jQuery;

require('bootstrap-webpack');
let BootstrapMenu = require('bootstrap-menu');

let compiler = require('runway-compiler/compiler.js');
window.compiler = compiler;
let Simulator = require('runway-compiler/simulator.js').Simulator;
let GlobalEnvironment = require('runway-compiler/environment.js').GlobalEnvironment;
let Input = require('runway-compiler/input.js');
let Highlight = require('./highlight.js');
let Execution = require('runway-compiler/execution.js');
let files = require('./files.js');

let d3 = require('d3');
window.d3 = d3;

let _ = require('lodash');
//delete window._;

let errors = require('runway-compiler/errors.js');
let Tooltip = require('./tooltip.js');
let Util = require('./util.js');
let StateDump = require('./statedump.jsx');
let RuleControls = require('./rulecontrols.jsx');
let ExecutionView = require('./executionview.jsx');
let REPLView = require('./repl.jsx');
let Controller = require('./controller.js').Controller;

let preludeText = require('runway-compiler/prelude.model');

let queryString = require('querystring');
let getParams = queryString.parse(window.location.search.slice(1));

let React = require('react');
let ReactDOM = require('react-dom');

let babel = require('babel-standalone');
let Timeline = require('./timeline.jsx');

let useClock = getParams['clock'] && true;
let clockUnits;
if (useClock) {
  if (['us', 'ms', 's'].indexOf(getParams['clock']) >= 0) {
    clockUnits = getParams['clock'];
  } else {
    clockUnits = 'ms';
  }
}

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
  Changesets: require('runway-compiler/changesets.js'),
  lodash: _,
  Timeline: Timeline,
  d3: d3,
  colorbrewer: require('colorbrewer'),
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
    this.tab = 'state';
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

class TimelineView {
  constructor(controller, elem, module) {
    this.name = 'Timeline';
    this.controller = controller;
    this.elem = elem;
    this.module = module;
    this.component = ReactDOM.render(
      React.createElement(Timeline, {
          controller: this.controller,
          x: 75,
          y: 50,
          width: 850,
          height: 100,
      }), elem);
  }
  update(changes) {
    this.component.setState({});
  }
}

let pageLoaded = new Promise((resolve, reject) => {
  jQuery(window).load(resolve);
});


let examples = 'node_modules/runway-compiler/examples/';
let basename = 'toomanybananas/toomanybananas';
if ('model' in getParams) {
  basename = getParams['model'];
}

pageLoaded.then(() => {
  jQuery('.page-header h2 small').text(`${basename}.model`);
});

Promise.all([
  fetchRemoteFile(examples + basename + '.model'),
  fetchRemoteModule(examples + basename + '.js')
    .catch(err => {
      console.log(`Failed to get JS file over HTTP: ${err}`);
      return fetchRemoteJSX(examples + basename + '.jsx');
    })
    .catch(err => {
      console.log(`Failed to get view file over HTTP: ${err}`);
      return null;
    }),
  pageLoaded,
]).then((results) => {
  let input = results[0];
  document.getElementById('modelcode').appendChild(Highlight(input.getText()));

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
  controller.clockUnits = clockUnits;

  workerClient.load(preludeText, input, useClock);
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
    new ExecutionView(controller, jQuery('#execution-inner')[0], module));
  controller.views.push(
    new REPLView(controller, jQuery('#repl')[0], module));
  controller.views.push(
    new TimelineView(controller, jQuery('#timeline')[0], module));

  controller.workspace.invariantError.sub(msg => {
    jQuery('#error').text(msg);
  });
  controller.workspace.update.sub(changes => {
    if (controller.workspace.cursor.getEvent().passedInvariants === false) {
      controller.workspace.checkInvariants();
    }
  });

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
      let resize = () => {
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
      };
      resize();
      viewWrapper.mouseup(resize);
    });
  }
  jQuery('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    controller._updateViews();
  });


  let animate = false;
  let animating = false;
  let playbackId = undefined;
  let playbackStart = 0;

  let usefulWorkerId = undefined;
  let nextWorkerId = 1;
  let deadlockEvent = undefined;
  let startSimulating = () => {
    let cursor = controller.workspace.cursor.execution.last();
    let startEvent = cursor.getEvent();
    if (usefulWorkerId === undefined &&
        (startEvent.clock < controller.workspace.clock + 1e5 ||
         jQuery('#simulate')[0].checked) &&
        startEvent !== deadlockEvent) {
      let thisWorkerId = nextWorkerId;
      nextWorkerId += 1;
      usefulWorkerId = thisWorkerId;
      workerClient.simulate(startEvent).then(result => {
        let newEvents = result.events;
        if (usefulWorkerId === thisWorkerId) {
          usefulWorkerId = undefined;
          if (newEvents.length === 0) {
            deadlockEvent = startEvent;
          } else {
            deadlockEvent = undefined;
          }
        }
        controller.workspace._output = result.output;
        if (newEvents.length > 0) {
          newEvents.forEach(event => {
            cursor = cursor.addEvent(event);
          });
          controller._updateViews(['execution']);
          startSimulating();
        }
      });
    }
  };
  jQuery('#simulate').change(startSimulating);

  controller.workspace.forked.sub(execution => {
    usefulWorkerId = undefined;
    startSimulating();
  });


  // 'playbackSpeed' is the "x" of slowdown.
  // For asynchronous models without clocks, steps are executed every 10ms of
  // simulation time.
  window.playbackSpeed = getParams['speed'] || 100;
  jQuery('body > div')
    .addClass('paused');
  let toggleAnimate = () => {
    if (jQuery('#playback')[0].checked) {
      jQuery('body > div')
        .addClass('playback')
        .removeClass('paused');
    } else {
      jQuery('body > div')
        .addClass('paused')
        .removeClass('playback');
    }
    let stop = () => {
      window.cancelAnimationFrame(playbackId);
      playbackId = undefined;
    };
    if (playbackId === undefined) {
      let draw = when => {
        playbackId = undefined;
        let elapsed = (when - playbackStart);
        playbackStart = when;
        //console.log('elapsed:', elapsed, 'ms');
        if (elapsed > 500) { // probably had another tab open
          console.log(`Too much time elapsed between animation ` +
            `frames: ${elapsed} ms`);
          elapsed = 0;
        }
        controller.workspace.advanceClock(elapsed * 1000 / window.playbackSpeed);
        let maxGen = controller.workspace.cursor.execution.last().getEvent().clock;
        if (controller.workspace.clock >= maxGen) {
          controller.workspace.setClock(maxGen);
        }
        startSimulating();
        playbackId = window.requestAnimationFrame(draw);
      };
      draw(playbackStart);
    } else {
      stop();
    }
  };
  jQuery('#playback').change(toggleAnimate);
  let mapPlaybackSpeed = fn => {
    window.playbackSpeed = _.clamp(fn(window.playbackSpeed), .1, 5000000);
    console.log(`replay speed set to ${window.playbackSpeed}x slowdown`);
  };
  jQuery('#slower').click(() => mapPlaybackSpeed(s => s * 2));
  jQuery('#faster').click(() => mapPlaybackSpeed(s => s / 2));
});

let getExecution = function() {
  let events = controller.workspace.cursor.execution
    .map(e => JSON.stringify(e, null, 2))
    .join(',\n\n');
  return `[\n\n${events}\n\n]`;
};

jQuery(function() {
  jQuery('#execution button.download')
    .click(() => files.download(getExecution(), 'execution.json', 'application/json'));
  jQuery('#execution button.upload')
    .click(() => files.upload('application/json').then(text => {
      let execution = new Execution(JSON.parse(text));
      controller.workspace.reset(execution.forkStart(), 0);
    }));
});
