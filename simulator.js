"use strict";

let RuleFor = require('./statements/rulefor.js');
let Util = require('./util.js');

let stateString = (module) => {
  let o = [];
  let vars = module.env.vars.forEachLocal((v, k) => o.push(`${k}: ${v}`));
  return o.join('\n');
};

let simulate = (module) => {
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

  Util.shuffle(simpleRules);
  let start = stateString(module);
  for (let rule of simpleRules) {
    //console.log(rule.name, 'start');
    rule.fire();
    //console.log(rule.name, 'done');
    let now = stateString(module);
    if (start !== now) {
      console.log(rule.name);
      return rule.name;
    }
  }
  console.log('deadlock');
};

module.exports = simulate;
