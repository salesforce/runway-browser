"use strict";

let RuleFor = require('./statements/rulefor.js');
let Changesets = require('./changesets.js');
let _ = require('lodash');
let performance = {now: require('performance-now')};

let slow = (module, controller) => {

  let simpleRules = [];
  let context = [];
  module.env.rules.forEach((rule, name) => {
    if (rule.simulatorDisable) {
      return;
    }
    if (rule instanceof RuleFor) {
      rule.expr.evaluate(context).forEach((v, i) => {
        simpleRules.push({
          name: `${name}(${i})`,
          fire: () => rule.fire(i, context),
        });
      });
    } else {
      simpleRules.push({
        name: name,
        fire: () => rule.fire(context),
      });
    }
  });

  simpleRules = _.shuffle(simpleRules);
  for (let rule of simpleRules) {
    let changes = controller.tryChangeState(() => {
      rule.fire();
      return rule.name;
    });
    if (!Changesets.empty(changes)) {
      return true;
    }
  }
  console.log('deadlock');
  return false;
};

class Simulator {
  constructor(module, controller) {
    this.module = module;
    this.controller = controller;
  }

  step() {
    let start = performance.now();
    let rulesets = _.reject(this.controller.getRulesets(),
      'simulatorDisable');
    let rules = _.flatMap(rulesets, ruleset => ruleset.rules)
    rules = _.filter(rules, rule => (rule.active !== this.controller.INACTIVE));
    rules = _.shuffle(rules);
    for (let rule of rules) {
      if (!Changesets.empty(rule.fire())) {
        let stop = performance.now();
        console.log(`simulate took ${_.round(stop - start, 3)} ms`);
        return true;
      }
    }
    console.log('deadlock', this.controller.serializeState().toString());
    return false;
  }

}

module.exports = {
  slow: slow,
  Simulator: Simulator,
};
