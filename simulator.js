"use strict";

let RuleFor = require('./statements/rulefor.js');
let Util = require('./util.js');

let stateString = (module) => {
  let o = [];
  let vars = module.env.vars.forEachLocal((v, k) => o.push(`${k}: ${v}`));
  return o.join('\n');
};

let simulate = (module) => {
  let checkInvariants = () => {
    module.env.invariants.forEachLocal((invariant, name) => {
      //console.log(name, 'start');
      invariant.check();
      //console.log(name, 'done');
    });
  };
  checkInvariants();
  let simpleRules = [];
  module.env.rules.forEachLocal((rule, name) => {
    if (rule instanceof RuleFor) {
      let indextype = rule.expr.type.indextype;
      for (let i = indextype.low; i <= indextype.high; ++i) {
        simpleRules.push({
          name: `${name}(${i})`,
          fire: () => rule.fire(i),
        });
      }
    } else {
      simpleRules.push({
        name: name,
        fire: () => rule.fire(),
      });
    }
  });

  Util.shuffle(simpleRules);
  let start = stateString(module);
  for (let rule of simpleRules) {
    //console.log(rule.name, 'start');
    rule.fire();
    //console.log(rule.name, 'done');
    let now = stateString(module);
    if (start !== now) {
      console.log(rule.name);
      checkInvariants();
      return;
    }
  }
  console.log('deadlock');
};

module.exports = simulate;
