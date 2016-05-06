'use strict';

let jQuery = require('jquery');
window.jQuery = jQuery;

require('bootstrap-webpack');

let compiler = require('runway-compiler/lib/compiler.js');
window.compiler = compiler;
let GlobalEnvironment = require('runway-compiler/lib/environment.js').GlobalEnvironment;
let Input = require('runway-compiler/lib/input.js');
let Highlight = require('./highlight.js');
let makeBrowserRequire = require('./browserrequire.js');

let _ = require('lodash');
//delete window._;

let StateDump = require('./statedump.jsx');
let RuleControls = require('./rulecontrols.jsx');
let ExecutionView = require('./executionview.jsx');
let REPLView = require('./repl.jsx');
let AboutView = require('./about.js');
let Controller = require('./controller.js').Controller;

let preludeText = require('runway-compiler/lib/prelude.model');

let queryString = require('querystring');
let getParams = queryString.parse(window.location.search.slice(1));

let React = require('react');
let ReactDOM = require('react-dom');

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
let workerClient = new WorkerClient();

let meval = (text) => {
  let env = new GlobalEnvironment(prelude.env);
  let module = compiler.load(new Input('eval', text), env);
  let context = {
    clock: 0,
  };
  module.ast.execute(context);
};
window.meval = meval;

/*
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
*/

class HTMLStateView {
  constructor(controller) {
    this.name = 'HTMLStateView';
    this.controller = controller;
    this.component = this.controller.mountTab(elem =>
       ReactDOM.render(
        React.createElement(
          StateDump.StateDumpEnv,
          {
            env: this.controller.workspace.module.env,
            controller: this.controller,
          }),
        elem), 'state', 'State');
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


let basename = 'counter/counter';
if ('model' in getParams) {
  basename = getParams['model'];
}

pageLoaded.then(() => {
  jQuery('.page-header h2 small').text(`${basename}.model`);
});

let browserRequire = makeBrowserRequire('models/');

Promise.all([
  browserRequire(`./${basename}.model`),
  browserRequire(`./${basename}.js`)
    .catch(err => {
      console.log(`Failed to get JS file over HTTP: ${err}`);
      return browserRequire(`./${basename}.jsx`);
    })
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
  controller.clockUnits = clockUnits;

  workerClient.load(preludeText, input, useClock);

  controller.errorHandler = (msg, e) => {
    console.log(msg);
    jQuery('#error').text(msg);
    throw e;
  };
  controller.resetHandler = () => {
    jQuery('#error').text('');
  };
  window.controller = controller;
  controller.addView(HTMLStateView);
  controller.addView(ExecutionView);
  controller.addView(REPLView);
  controller.mountTab(elem => elem.appendChild(Highlight(input.getText())),
    'modelcode', 'Model Code');
  controller.addView(AboutView);

  controller.views.push(
    new RuleControls(controller, jQuery('#rulecontrols')[0], module));
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
