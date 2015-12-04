"use strict";

let RuleFor = require('./statements/rulefor.js');

// getRandomInt is based on:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
//
// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
let getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min;
};

let shuffle = (array) => {
  // at every loop iteration, we'll decide what belongs at array[i].
  for (let i = 0; i < array.length; ++i) {
    let j = getRandomInt(i, array.length);
    let tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
};

let stateString = (module) => {
  let o = [];
  let vars = module.env.vars.forEachLocal((v, k) => o.push(`${k}: ${v}`));
  return o.join('\n');
};

let simulate = (module) => {
  let rules = module.env.listRules();
  let simpleRules = [];
  rules.forEach((name) => {
    let rule = module.env.getRule(name);
    if (rule instanceof RuleFor) {
      let indextype = rule.expr.type.indextype;
      for (let i = indextype.low; i <= indextype.high; ++i) {
        simpleRules.push([
          `${rule.parsed.id.value}(${i})`,
          () => rule.fire(i),
        ]);
      }
    } else {
      simpleRules.push([
        `${rule.parsed.id.value}`,
        () => rule.fire(),
      ]);
    }
  });

  shuffle(simpleRules);
  let start = stateString(module);
  let nf;
  for (nf of simpleRules) {
    let name = nf[0];
    let fire = nf[1];
    fire();
    let now = stateString(module);
    if (start !== now) {
      console.log(name);
      return;
    }
  }
  console.log('deadlock');
};

module.exports = simulate;
