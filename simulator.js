"use strict";

let RuleFor = require('./statements/rulefor.js');
let _ = require('lodash');

let simulate = (module, controller) => {

  let simpleRules = [];
  let context = [];
  module.env.rules.forEachLocal((rule, name) => {
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
    let changed = controller.tryChangeState(() => {
      rule.fire();
      return rule.name;
    });
    if (changed) {
      return;
    }
  }
  console.log('deadlock');
};

module.exports = simulate;
