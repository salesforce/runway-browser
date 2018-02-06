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

let Featured = require('../dist/featured.json');
let Controller = require('./controller.js').Controller;
let Highlight = require('./highlight.js');
let makeBrowserRequire = require('./browserrequire.js');
let WorkerClient = require('./workerclient.js');

let showAbout = require('./about.js');
let ExecutionView = require('./executionview.jsx');
let REPLView = require('./repl.jsx');
let RuleControls = require('./rulecontrols.jsx');
let StateDump = require('./statedump.jsx');
let TimelineView = require('./timeline.jsx').TimelineView;

let workerClient = new WorkerClient();

let pageLoaded = new Promise((resolve, reject) => {
  jQuery(window).on('load', resolve);
});

class Package {
  constructor(original, repo) {
    this.original = original;
    this.repo = repo; // may be undefined
    this.p = _.cloneDeep(original);

    let basename;
    if (repo !== undefined) {
      basename = _.last(repo.split('/'));
      if (repo.startsWith('github.com/')) {
        basename = repo.split('/')[2];
      }
      let m = basename.match('^runway-model-(.*)$');
      if (m !== null) {
        basename = m[1];
      }
    }

    if (this.p === undefined) {
      this.p = {};
    }

    if (this.p.name === undefined) {
      this.p.name = basename;
    }

    if (this.p['runway-label'] === undefined) {
      let m = this.p.name.match('^runway-model-(.*)$');
      if (m === null) {
        this.p['runway-label'] = this.p.name;
      } else {
        this.p['runway-label'] = m[1];
      }
    }

    if (this.p.models === undefined ||
        this.p.models === []) {
      console.log(`No models specified in package.json, ` +
        `guessing ${basename}.model and ${basename}.js`);
      this.p.models = [
        {
          id: basename,
          name: basename,
          spec: `${basename}.model`,
          view: `${basename}.js`,
        }
      ];
    }
    if (!_.isArray(this.p.models)) {
      // This format is deprecated. Models used to be a plain object, but
      // that doesn't provide ordering for menu items.
      this.p.models = _.toPairs(this.p.models).map(kv => {
        if (_.isString(kv[1])) {
          return {id: kv[0], alias: kv[1]};
        } else {
          kv[1].id = kv[0];
          return kv[1];
        }
      });
    }
    this.p.models.forEach(m => {
      if (m.id === undefined) {
        m.id = basename;
      }
      if (m.label === undefined) {
        m.label = m.name;
        if (m.label === undefined) {
          m.label = m.id;
        }
      }
    });
  }

  getModel(id) {
    let model;
    if (id === undefined) {
      model = _.first(this.p.models);
    } else {
      model = _.find(this.p.models, m => m.id === id);
    }
    if (model !== undefined &&
        model.alias !== undefined) { // permit one level of aliasing
      return _.find(this.p.models, m => m.id === model.alias);
    }
    return model;
  }

  getRepo() {
    if (this.repo !== undefined) {
      return this.repo;
    }
    if (this.p.repository === undefined ||
        this.p.repository.type !== 'git') {
      return undefined;
    }
    let m = this.p.repository.url.match('https://github.com/(.*)/(.*).git');
    if (m === null) {
      return undefined;
    }
    return `github.com/${m[1]}/${m[2]}`;
  }
}

class ModelsNav {
  constructor(active) {
    this.active = active;
    this.found = false;
    this.ul = jQuery('<ul>')
      .addClass('nav')
      .addClass('navbar-nav');
    pageLoaded.then(() => {
      jQuery('#models-nav').append(this.ul);
    });
    Featured.forEach(repo => this.append(repo));
  }

  loaded(packageJSON) {
    if (!this.found) {
      this.append(packageJSON);
    }
  }

  append(packageJSON) {
    let repo = packageJSON.getRepo();
    let li = jQuery('<li>');
    this.ul.append(li);
    if (packageJSON.p.models.length == 1) {
      li.append(
        jQuery('<a>')
          .attr('href', `?model=${repo}`)
          .text(packageJSON.p.models[0].label));
      if (this.active.startsWith(repo)) {
        li.addClass('active');
        this.found = true;
      }
    } else {
      li.addClass('dropdown');
      li.append(
        jQuery('<a>')
          .attr('href', '#')
          .addClass('dropdown-toggle')
          .attr('data-toggle', 'dropdown')
          .append(packageJSON.p['runway-label'])
          .append(jQuery('<span>').addClass('caret')));
      let dropul = jQuery('<ul>')
        .addClass('dropdown-menu');
      packageJSON.p.models.forEach((model, i) => {
        if ('alias' in model) {
          return; // skip alias
        }
        let dropli = jQuery('<li>')
          .append(jQuery('<a>')
            .attr('href', `?model=${repo}:${model.id}`)
            .text(model.label));
        if (this.active === `${repo}:${model.id}` ||
            (this.active === `${repo}` && i == 0)) {
          li.addClass('active');
          dropli.addClass('active');
          this.found = true;
        }
        dropul.append(dropli);
      });
      li.append(dropul);
    }
  }
}

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
    jQuery('#error').text(e).parent().show();
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
};

let setUpResizing = view => {
  let viewWrapper = jQuery('#viewwrapper');
  if(Number.isInteger(view.width)) { viewWrapper.width(view.width); }
  if(Number.isInteger(view.height)) { viewWrapper.height(view.height); }
  if (view.wideView) {
    viewWrapper.width(viewWrapper.width() * 1.5);
  }
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

    if(view.customView) {
      width = view.width;
      height = view.height;
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

    jQuery('#playbutton .play').show();
    jQuery('#playbutton .pause').hide();

    jQuery('#playbutton').click(_ => {
      this.toggle(playing => {
        if (playing == true) {
          jQuery('#playbutton .play').show();
          jQuery('#playbutton .pause').hide();
        } else {
          jQuery('#playbutton .pause').show();
          jQuery('#playbutton .play').hide();
        }
      });
    });

    jQuery('#details').click(() => {
      if (jQuery('#tabs').is(':visible')) {
        jQuery('#tabs').hide();
      } else {
        jQuery('#tabs').show();
      }
    })
  }

  stop() {
    window.cancelAnimationFrame(this.animationId);
    this.animationId = undefined;
    pageLoaded.then(() => {
      jQuery('body > div')
        .addClass('paused')
        .removeClass('playback');
      this.isPlaying = false;
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

  toggle(cb) {
    if(this.isPlaying == true) {
      this.stop();
    } else {
      this.start();
    }
    cb(this.isPlaying);
  }

  start() {
    if (this.animationId !== undefined) {
      return;
    }
    this.animationId = window.requestAnimationFrame(
      when => this.onAnimationFrame(when));
    pageLoaded.then(() => {
      jQuery('body > div')
        .addClass('playback')
        .removeClass('paused');
      this.isPlaying = true;
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

let loadModel = locator => {
  let modelsNav = new ModelsNav(locator);

  let whichModel = undefined;
  let split = locator.split(':', 2);
  let repo = locator;
  if (split.length == 2) {
    repo = split[0];
    whichModel = split[1];
  }

  let browserRequire = makeBrowserRequire('models/').cd(repo);

  // This is here to prevent an
  // [Open Redirect](https://www.owasp.org/index.php/Open_redirect)
  // vulnerability.
  let trustworthy = new Promise((resolve, reject) => {
    // skip warning for trusworty sources
    if (repo.match('^[\\w\\-/]*$') !== null) {
      resolve(); // local
      return;
    }
    if (repo.match(new RegExp('^github.com/(salesforce|SalesforceEng|ongardie)/runway-model-.*', 'i')) !== null) {
      resolve(); // trusted GitHub users/orgs
      return;
    }

    pageLoaded.then(() => {
      let modal = jQuery(`
        <div class="modal fade bs-example-modal-sm" tabindex="-1">
          <div class="modal-dialog modal-sm">
            <div class="modal-content">
              <div class="modal-body">
                <p class="alert alert-warning">
                  You're about to open a model from <code>?</code>, a third
                  party.
                </p>
                <p>
                  <small>
                    You should only do this if you trust the source, which will
                    provide JavaScript to run in your browser. Malicious
                    JavaScript could try to compromise your browser or send you
                    to a malicious website.
                  </small>
                </p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-default cancel">Cancel</button>
                <button type="button" class="btn btn-warning continue">Continue</button>
              </div>
            </div>
          </div>
        </div>
      `);
      jQuery('.alert code', modal).text(repo);
      jQuery('button.cancel', modal).click(() => {
        window.location = '?';
      });
      jQuery('button.continue', modal).click(() => {
        modal.modal('hide');
        resolve();
      });
      modal.modal({backdrop: 'static'});
      jQuery('body').append(modal);
    });
  }); // trustworthy promise

  trustworthy
    .then(() => browserRequire.remote('package.json'))
    .catch(err => {
      console.log(`Failed to get package.json file over HTTP: ${err}`);
      return {};
    })
    .then(packageJSON => {
      packageJSON = new Package(packageJSON, repo);
      let modelJSON = packageJSON.getModel(whichModel);
      if (modelJSON === undefined) {
        throw new Error(`Can't find ${whichModel} in package.json`);
      }

      modelsNav.loaded(packageJSON);

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
              jQuery('#error').text(msg).parent().show();
            });
            setUpDefaultViews(controller);
            jQuery('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
              controller._updateViews();
            });
            controller.workspace.forked.sub(execution => {
              let node = jQuery('#timeline').parent();
              node.height(node.height() + 20);
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

Featured = Featured.map(p => new Package(p));
let defaultModel = 'counter';
if (Featured.length > 0) {
  defaultModel = Featured[0].getRepo();
}

if ('about' in getParams) {
  new ModelsNav('');
  pageLoaded.then(() => {
    jQuery('#navbar-about').addClass('active');
    let node = jQuery('body > div.container-fluid:first');
    node.html('');
    showAbout(node[0]);
  });
} else {
  if ('model' in getParams) {
    loadModel(getParams['model']);
  } else {
    loadModel(defaultModel);
  }
}
