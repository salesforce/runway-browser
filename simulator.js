"use strict";

let RuleFor = require('./statements/rulefor.js');
let Changesets = require('./changesets.js');
let _ = require('lodash');

let slow = (module, controller) => {

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

    this.rulesets = [];
    module.env.rules.forEachLocal((rule, name) => {
      if (rule.simulatorDisable) {
        return;
      }
      if (rule instanceof RuleFor) {
        let ruleset = {};
        let update = () => {
          let context = {readset: new Set()};
          let rules = [];
          rule.expr.evaluate(context).forEach((v, i) => {
            rules.push({
              name: `${name}(${i})`,
              fire: context => rule.fire(i, context),
              active: true,
              readset: new Set(), // only if active is false
            });
          });
          ruleset.readset = context.readset;
          ruleset.rules = rules;
        };
        update();
        ruleset.update = update;
        this.rulesets.push(ruleset);
      } else {
        this.rulesets.push({
          readset: [],
          rules: [{
            name: name,
            fire: context => rule.fire(context),
            active: true,
            readset: new Set(), // only if active is false
          }],
          update: _.noop,
        });
      }
    });

    this.invariants = [];
    this.module.env.invariants.forEachLocal((invariant, name) => {
      let context = {readset: new Set()};
      invariant.check(context);
      this.invariants.push({
        name: name,
        readset: context.readset,
        check: context => invariant.check(context),
      });
    });
  }

  checkInvariants(changes) {
    for (let invariant of this.invariants) {
      if (Changesets.affected(changes, invariant.readset)) {
        let context = {readset: new Set()};
        try {
          invariant.check(context);
          invariant.readset = context.readset;
        } catch ( e ) {
          if (e instanceof errors.Runtime) {
            let msg = `Failed invariant ${invariant.name}: ${e}`;
            this.controller.errorHandler(msg, e);
            return false;
          } else {
            throw e;
          }
        }
      }
    }
    return true;
  }

  step(i) {
    let rules = _.shuffle(
      _.filter(_.flatMap(this.rulesets,
                         ruleset => ruleset.rules),
               'active'));
    for (let rule of rules) {
      let context = {readset: new Set()};
      let changed = this.controller.tryChangeState(() => {
        rule.fire(context);
        return rule.name;
      }, (changes) => this.checkInvariants(changes));
      if (changed) {
        this.rulesets.forEach(ruleset => {
          if (Changesets.affected(changed, ruleset.readset)) {
            ruleset.update();
          }
          ruleset.rules.forEach(rule => {
            if (!rule.active &&
                Changesets.affected(changed, rule.readset)) {
              rule.active = true;
            }
          });
        });
        return true;
      } else {
        rule.active = false;
        rule.wentInactive = i;
        // Array.from makes debugging easier
        rule.readset = Array.from(context.readset);
      }
    }
    console.log('deadlock', JSON.stringify(this.rulesets, null, 2));
    return false;
  }

}

module.exports = {
  slow: slow,
  Simulator: Simulator,
};
