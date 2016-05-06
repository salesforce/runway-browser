/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

'use strict';

let compiler = require('runway-compiler/lib/compiler.js');
let Simulator = require('runway-compiler/lib/simulator.js').Simulator;
let GlobalEnvironment = require('runway-compiler/lib/environment.js').GlobalEnvironment;
let Input = require('runway-compiler/lib/input.js');
let Execution = require('runway-compiler/lib/execution.js');
let Workspace = require('runway-compiler/lib/workspace.js').Workspace;

let module;
let workspace;
let simulator;
let useClock;

let load = function(data) {
  useClock = data.useClock;
  let prelude = compiler.loadPrelude(data.preludeText, {
    clock: useClock,
  });
  let env = new GlobalEnvironment(prelude.env);
  module = compiler.load(new Input(data.input.filename, data.input.text), env);
  let context = {
    clock: 0,
  };
  module.ast.execute(context);
  workspace = new Workspace(module);

  simulator = new Simulator(module, workspace);
  return Promise.resolve({});
};

let simulate = function(event) {
  if (event !== undefined) {
    workspace.reset(new Execution(event).last(), event.clock);
  }
  let clockLimit = workspace.clock + 1e5;
  let wallLimit = performance.now() + 200;
  let count = 0;
  while (count < 100 &&
         workspace.clock < clockLimit &&
         performance.now() < wallLimit) {
    if (!useClock) {
      workspace.advanceClock(10000);
    }
    if (!simulator.step()) {
      break;
    }
  }
  let newEvents = workspace.cursor.map(event => event).slice(1);
  workspace.reset(workspace.cursor.execution.last(), workspace.clock);
  return Promise.resolve({
    events: newEvents,
    output: workspace.takeOutput(),
  });
};

self.onmessage = function(e) {
  let handler;
  if (e.data.type === 'load') {
    handler = load;
  } else if (e.data.type === 'simulate') {
    handler = simulate;
  } else {
    throw new Error(`Invalid message type: ${e.data.type}`);
  }
  handler(e.data.payload).then(payload => {
    self.postMessage({
      type: e.data.type,
      id: e.data.id,
      payload: payload,
    });
  });
};
