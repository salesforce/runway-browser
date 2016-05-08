/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

'use strict';

let jQuery = require('jquery');
window.jQuery = jQuery;
require('bootstrap-webpack');
let _ = require('lodash');
//delete window._;
let queryString = require('querystring');
let getParams = queryString.parse(window.location.search.slice(1));

let compiler = require('runway-compiler/lib/compiler.js');
window.compiler = compiler;
let GlobalEnvironment = require('runway-compiler/lib/environment.js').GlobalEnvironment;
let preludeText = require('runway-compiler/lib/prelude.model');
let PubSub = require('runway-compiler/lib/pubsub.js');

let Controller = require('./controller.js').Controller;
let Highlight = require('./highlight.js');
let makeBrowserRequire = require('./browserrequire.js');
let WorkerClient = require('./workerclient.js');

let AboutView = require('./about.js');
let ExecutionView = require('./executionview.jsx');
let REPLView = require('./repl.jsx');
let RuleControls = require('./rulecontrols.jsx');
let StateDump = require('./statedump.jsx');
let TimelineView = require('./timeline.jsx').TimelineView;

let workerClient = new WorkerClient();

let pageLoaded = new Promise((resolve, reject) => {
  jQuery(window).load(resolve);
});

let createController = function(input, clockUnits) {
  let prelude = compiler.loadPrelude(preludeText, {
    clock: clockUnits !== undefined,
  });
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
  controller.input = input;
  controller.clockUnits = clockUnits;

  controller.workspace.update.sub(changes => {
    if (controller.workspace.cursor.getEvent().passedInvariants === false) {
      controller.workspace.checkInvariants();
    }
  });

  workerClient.load(preludeText, input, clockUnits !== undefined);
  return controller;
};

let setUpDefaultViews = controller => {
  controller.views.push(
    new RuleControls(controller, jQuery('#rulecontrols')[0], controller.workspace.module));
  controller.views.push(
    new TimelineView(controller, jQuery('#timeline')[0], controller.workspace.module));
  controller.addView(StateDump.HTMLStateView);
  controller.addView(ExecutionView);
  controller.addView(REPLView);
  controller.mountTab(elem => elem.appendChild(Highlight(controller.input.getText())),
    'modelcode', 'Model Code');
  controller.addView(AboutView);
};

let setUpResizing = view => {
  let viewWrapper = jQuery('#viewwrapper');
  let smallSide = view.bigView ? 1000 : 100;
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
    view.update(['layout']);
  };
  resize();
  viewWrapper.mouseup(resize);
};


class Playback {
  constructor() {
    // Publishes the number of ticks to advance by.
    this.tick = new PubSub();

    // 'speed' is the "x" of slowdown.
    // For asynchronous models without clocks, steps are executed every 10ms of
    // simulation time.
    this.speed = 100;

    // When animating, this is the ID returned by
    // window.requestAnimationFrame(). Otherwise undefined.
    this.animationId = undefined;

    // The last time draw was called, in ms.
    // Used to determine how much time has elapsed.
    this.playbackStart = 0;

    pageLoaded.then(() => this.initPage());
  }

  initPage() {
    let map = fn => {
      this.speed = _.clamp(fn(this.speed), .1, 5000000);
      console.log(`replay speed set to ${this.speed}x slowdown`);
    };
    jQuery('#slower').click(() => map(s => s * 2));
    jQuery('#faster').click(() => map(s => s / 2));

    jQuery('body > div')
      .addClass('paused');

    jQuery('#playback').change(() => {
      if (jQuery('#playback')[0].checked) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  stop() {
    window.cancelAnimationFrame(this.animationId);
    this.animationId = undefined;
    pageLoaded.then(() => {
      jQuery('#playback')[0].checked = false;
      jQuery('body > div')
        .addClass('paused')
        .removeClass('playback');
    });
  }

  onAnimationFrame(when) {
    this.animationId = undefined;
    let elapsed = (when - this.playbackStart);
    this.playbackStart = when;
    //console.log('elapsed:', elapsed, 'ms');
    if (elapsed > 500) { // probably had another tab open
      console.log(`Too much time elapsed between animation ` +
        `frames: ${elapsed} ms`);
    } else {
      this.tick.pub(elapsed * 1000 / this.speed);
    }
    this.animationId = window.requestAnimationFrame(
      when => this.onAnimationFrame(when));
  }

  start() {
    if (this.animationId !== undefined) {
      return;
    }
    this.animationId = window.requestAnimationFrame(
      when => this.onAnimationFrame(when));
    pageLoaded.then(() => {
      jQuery('#playback')[0].checked = true;
      jQuery('body > div')
        .addClass('playback')
        .removeClass('paused');
    });
  }

  animating() {
    return this.animationId !== undefined;
  }
}
let playback = new Playback();

let makeCounter = next => {
  return () => {
    let r = next;
    next += 1;
    return r;
  };
};

class WorkerSimulation {
  constructor(controller) {
    this.controller = controller;

    // Used to match up simulation requests and replies.
    this.allocateWorkerId = makeCounter(1);
    // The ID of a simulation request that we think will generate events to
    // append to the current execution. Otherwise undefined.
    // TODO: is it possible to compare cursors instead? Would be clearer.
    this.usefulWorkerId = undefined;
    // If defined, this event is known to not have any successors, so don't
    // bother trying to run the simulator on it again.
    this.deadlockEvent = undefined;

    this.controller.workspace.forked.sub(execution => {
      this.usefulWorkerId = undefined;
      this.startSimulating();
    });

    pageLoaded.then(() => {
      jQuery('#simulate').change(() => this.startSimulating());
    });
  }

  startSimulating() {
    let cursor = this.controller.workspace.cursor.execution.last();
    let startEvent = cursor.getEvent();
    if (this.usefulWorkerId === undefined &&
        (startEvent.clock < this.controller.workspace.clock + 1e5 ||
         jQuery('#simulate')[0].checked) &&
        startEvent !== this.deadlockEvent) {
      let thisWorkerId = this.allocateWorkerId();
      this.usefulWorkerId = thisWorkerId;
      workerClient.simulate(startEvent).then(result => {
        let newEvents = result.events;
        if (this.usefulWorkerId === thisWorkerId) {
          this.usefulWorkerId = undefined;
          if (newEvents.length === 0) {
            this.deadlockEvent = startEvent;
          } else {
            this.deadlockEvent = undefined;
          }
        }
        this.controller.workspace._output = result.output;
        if (newEvents.length > 0) {
          newEvents.forEach(event => {
            cursor = cursor.addEvent(event);
          });
          this.controller._updateViews(['execution']);
          this.startSimulating();
        }
      });
    }
  }
}

let loadModel = repo => {
  pageLoaded.then(() => {
    jQuery('.page-header h2 small').text(`Loading ${repo}`);
  });

  let whichModel = 'main';
  let split = repo.split(':', 2);
  if (split.length == 2) {
    repo = split[0];
    whichModel = split[1];
  }
  let basename = _.last(repo.split('/'));
  if (repo.startsWith('github.com/')) {
    basename = repo.split('/')[2];
  }
  let m = basename.match('^runway-model-(.*)$');
  if (m !== null) {
    basename = m[1];
  }

  let browserRequire = makeBrowserRequire('models/').cd(repo);
  browserRequire.remote('package.json')
    .catch(err => {
      console.log(`Failed to get package.json file over HTTP: ${err}`);
      return {};
    })
    .then(packageJSON => {
      if (packageJSON === undefined) {
        packageJSON = {};
      }
      if (packageJSON.models === undefined) {
        console.log(`No models specified in package.json, ` +
          `guessing ${basename}.model and ${basename}.js`);
        packageJSON.models = {
          main: {
            name: `${basename}`,
            spec: `${basename}.model`,
            view: `${basename}.js`,
          },
        };
      }
      let modelJSON = packageJSON.models[whichModel];
      if (_.isString(modelJSON)) { // permit one level of aliasing
        modelJSON = packageJSON.models[modelJSON];
      }
      if (modelJSON === undefined) {
        throw new Error(`Can't find ${whichModel} in package.json`);
      }

      let name = modelJSON.name;
      if (name === undefined) {
        if (whichModel === 'main') {
          name = basename;
        } else {
          name = whichModel;
        }
      }
      pageLoaded.then(() => {
        jQuery('.page-header h2 small').text(name);
      });

      let clockUnits;
      let clockParam = modelJSON.clock;
      if (clockParam === undefined) {
        clockParam = getParams['clock'];
      }
      if (clockParam) {
        if (['ns', 'us', 'ms', 's'].indexOf(clockParam) >= 0) {
          clockUnits = clockParam;
        } else {
          clockUnits = 'ms';
        }
      }

      if (modelJSON.slowdown !== undefined) {
        playback.speed = +modelJSON.slowdown * 1000;
      }
      if (getParams['speed'] !== undefined) {
        playback.speed = +getParams['speed'];
      }

      let specPromise = browserRequire.remote(modelJSON.spec);
      let viewPromise = browserRequire.remote(modelJSON.view)
        .catch(err => {
          console.log(`Failed to get view file over HTTP: ${err}`);
          return null;
        });

      specPromise
        .then(input => createController(input, clockUnits))
        .then(controller => {
          window.controller = controller;
          let workerSimulation = new WorkerSimulation(controller);
          playback.tick.sub(ticks => {
            controller.workspace.advanceClock(ticks);
            let maxGen = controller.workspace.cursor.execution.last().getEvent().clock;
            if (controller.workspace.clock >= maxGen) {
              controller.workspace.setClock(maxGen);
            }
            workerSimulation.startSimulating();
          });

          pageLoaded.then(() => {
            controller.workspace.invariantError.sub(msg => {
              jQuery('#error').text(msg);
            });
            setUpDefaultViews(controller);
            jQuery('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
              controller._updateViews();
            });

            viewPromise
              .then(userView =>
                new userView(controller,
                  jQuery('#view #user')[0],
                  controller.workspace.module))
              .then(userView => {
                if (userView.name === undefined) {
                  userView.name = 'User';
                }
                controller.views.push(userView);
                setUpResizing(userView);
              }); // view loaded
          }); // page loaded

        }); // spec loaded
    }); // package.json loaded
}; // loadModel()


let repo = 'counter';
if ('model' in getParams) {
  repo = getParams['model'];
}
loadModel(repo);
