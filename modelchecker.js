"use strict";


let crypto = require('crypto');
let fs = require('fs');
let process = require('process');

let GlobalEnvironment = require('./environment.js').GlobalEnvironment;
let Input = require('./input.js');
let compiler = require('./compiler.js');
let RuleFor = require('./statements/rulefor.js');
let errors = require('./errors.js');

let hash = input =>
  crypto.createHash('sha1')
    .update(input)
    .digest('binary');

let readFile = (filename) => fs.readFileSync(filename).toString();

let serializeState = (module) => {
  let state = {};
  module.env.vars.forEachLocal((mvar, name) => {
    if (!mvar.isConstant) {
      state[name] = mvar.toJSON();
    }
  });
  return JSON.stringify(state, null, 2);
};

let restoreState = (module, state) => {
  state = JSON.parse(state);
  module.env.vars.forEachLocal((mvar, name) => {
    if (!mvar.isConstant) {
      mvar.assignJSON(state[name]);
    }
  });
};

let extractSimpleRules = (module) => {
  let simpleRules = [];
  module.env.rules.forEachLocal((rule, name) => {
    if (rule instanceof RuleFor) {
      rule.expr.evaluate().forEach((v, i) => {
        simpleRules.push({
          name: `${name}(${i})`,
          fire: () => rule.fire(i),
        });
      });
    } else {
      simpleRules.push({
        name: name,
        fire: () => rule.fire(),
      });
    }
  });
  return simpleRules;
};

let catchBoundsErrors = false;

if (require.main === module) {
  let prelude = compiler.loadPrelude(readFile('prelude.model'));
  let env = new GlobalEnvironment(prelude.env);

  let filename = process.argv[2];
  let module = compiler.load(new Input(filename, readFile(filename)), env);
  module.ast.execute();

  let states = new Set(); // stores hashes of all known states satisfying invariants
  let unexplored = new Set(); // stores JSON of unexplored states (already known to satisfy invariants)

  let start = serializeState(module);
  module.env.invariants.forEachLocal((invariant, name) => {
    try {
      invariant.check();
    } catch (e) {
      console.log('Initial state', start);
      console.log('Failed', name);
      throw e;
    }
  });
  states.add(hash(start));
  unexplored.add(start);

  let printStatus = (cond) => {
    let expanded = states.size - unexplored.size;
    if (cond === undefined || cond(expanded)) {
      console.log(`Checked ${states.size}, ` +
        `expanded ${expanded} ` +
        `(${Math.round(expanded / states.size * 100)}% of checked)`);
    }
  };

  while (unexplored.size > 0) {
    let start = unexplored.values().next().value;
    unexplored.delete(start);
    restoreState(module, start);

    extractSimpleRules(module).forEach(rule => {
      try {
        rule.fire();
      } catch (e) {
        console.log('Started at', start);
        console.log('Fired', rule.name);
        throw e;
      }
      let state = serializeState(module);
      if (state !== start) {
        let stateHash = hash(state);
        if (!states.has(stateHash)) {
          module.env.invariants.forEachLocal((invariant, name) => {
            try {
              invariant.check();
            } catch (e) {
              console.log('Was at', start);
              console.log('Applied', rule.name);
              console.log('Reached', state);
              console.log('Failed', name);
              throw e;
            }
          });
          states.add(stateHash);
          unexplored.add(state);
        }
        restoreState(module, start);
      }
    });

    printStatus(expanded => (expanded % 100 == 0));
  }
  printStatus();
}
