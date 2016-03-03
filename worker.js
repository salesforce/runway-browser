'use strict';

let compiler = require('./compiler.js');
let Simulator = require('./simulator.js').Simulator;
let GlobalEnvironment = require('./environment.js').GlobalEnvironment;
let Input = require('./input.js');
let Execution = require('./execution.js');
let Context = require('./controller.js').Context;

let module;
let genContext;
let simulator;
let useClock = true;

let load = function(data) {
  let prelude = compiler.loadPrelude(data.preludeText, {
    clock: useClock,
  });
  let env = new GlobalEnvironment(prelude.env);
  module = compiler.load(new Input(data.input.filename, data.input.text), env);
  let context = {
    clock: 0,
  };
  module.ast.execute(context);
  genContext = new Context(module);
  genContext._init();

  simulator = new Simulator(module, genContext);
  return Promise.resolve({});
};

let simulate = function(data) {
  let start = genContext.cursor.execution.size();
  let clockLimit = genContext.clock + 1e5;
  let wallLimit = performance.now() + 200;
  let count = 0;
  while (count < 100 &&
         genContext.clock < clockLimit &&
         performance.now() < wallLimit) {
    if (!simulator.step()) {
      break;
    }
    if (!useClock) {
      genContext.advanceClock(10000);
    }
  }
  let newEvents = genContext.cursor
    .map((event, i) => i < start ? false : event)
    .filter(event => event);
  return Promise.resolve(newEvents);
};

let reset = function(event) {
  console.log('resetting worker to', event);
  genContext.reset(new Execution(event).last(), event.clock);
  return Promise.resolve({});
};


self.onmessage = function(e) {
  let handler;
  if (e.data.type === 'load') {
    handler = load;
  } else if (e.data.type === 'reset') {
    handler = reset;
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
