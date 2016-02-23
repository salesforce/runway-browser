'use strict';

let _ = require('lodash');
let Changesets = require('./changesets.js');
let errors = require('./errors.js');
let RuleFor = require('./statements/rulefor.js');
let performance = {now: require('performance-now')};

class SerializedState {
  constructor(state) {
    this.state = state;
  }
  toJSON() {
    return this.state;
  }
  toString() {
    return JSON.stringify(this.state, null, 2);
  }
  equals(other) {
    return _.isEqual(this.state, other.state);
  }
}

class Controller {
  constructor(module) {
    this.errorHandler = (msg, e) => { throw e; };
    this.resetHandler = () => {};
    this.module = module;
    this.views = [];
    this.clock = 0;
    this.execution = [{
      msg: 'Initial state',
      state: this.serializeState(),
      clock: this.clock,
      index: 0,
    }];

    this.invariants = this.module.env.invariants.map((invariant, name) => ({
      name: name,
      // if if false, checking the invariant is a waste of time
      active: true,
      // if !active, a change in one of these variables will
      // make the invariant active
      readset: null,
      check: context => invariant.check(context),
    }));

    this.checkInvariants();

    let makeRule = (name, _fire) => {
      let rule = {};
      rule.name = name;
      rule.fire = () => {
        let context = {
          readset: new Set(),
          clock: this.clock,
        };
        let changes = this.tryChangeState(() => {
          _fire(context);
          return name;
        });
        if (Changesets.empty(changes)) {
          rule.active = Controller.INACTIVE;
          rule.readset = context.readset;
          rule.changeset = changes;
        } else {
          rule.active = Controller.UNKNOWN;
          rule.readset = null;
          rule.changeset = null;
        }
        return changes;
      };
      rule.wouldChangeState = () => {
        if (rule.active === Controller.ACTIVE ||
            rule.active === Controller.INACTIVE) {
          return rule.changeset;
        } else {
          let context = {
            readset: new Set(),
            clock: this.clock,
          };
          let changes = this.wouldChangeState(() => {
            _fire(context);
          });
          if (Changesets.empty(changes)) {
            rule.active = Controller.INACTIVE;
            rule.readset = context.readset;
            rule.changeset = changes;
          } else {
            rule.active = Controller.ACTIVE;
            rule.readset = context.readset;
            rule.changeset = changes;
          }
          return changes;
        }
      };
      rule.active = Controller.UNKNOWN;
      rule.readset = null; // valid when INACTIVE or ACTIVE
      rule.changeset = null; // valid when INACTIVE ([]) or ACTIVE
      return rule;
    };

    this.rulesets = module.env.rules.map((rule, name) => {
      if (rule instanceof RuleFor) {
        let ruleset = {
          source: rule,
          rulefor: true,
          name: name,
        };
        let update = () => {
          let context = {
            readset: new Set(),
            clock: this.clock,
          };
          let rules = [];
          rule.expr.evaluate(context).forEach((v, i) => {
            rules.push(makeRule(`${name}(${i})`,
              context => rule.fire(i, context)));
          });
          ruleset.readset = context.readset;
          ruleset.rules = rules;
        };
        update();
        ruleset.update = update;
        return ruleset;
      } else {
        return {
          readset: [],
          rules: [makeRule(name, context => rule.fire(context))],
          update: _.noop,
          source: rule,
          name: name,
          rulefor: false,
        };
      }
    });
  }

  reportChanges(changes) {
    let affected = readset => (changes === undefined ||
      Changesets.affected(changes, readset));

    this.invariants.forEach(invariant => {
      if (!invariant.active && affected(invariant.readset)) {
          invariant.active = true;
          invariant.readset = null;
      }
    });
    this.rulesets.forEach(ruleset => {
      if (affected(ruleset.readset)) {
        ruleset.update();
      } else {
        ruleset.rules.forEach(rule => {
          if ((rule.active === Controller.ACTIVE ||
               rule.active === Controller.INACTIVE) &&
              affected(rule.readset)) {
            rule.active = Controller.UNKNOWN;
            rule.readset = null;
            rule.changeset = null;
          }
        });
      }
    });
  }

  getRulesets() {
    return this.rulesets;
  }

  checkInvariants() {
    for (let invariant of this.invariants) {
      if (invariant.active) {
        let context = {
          readset: new Set(),
          clock: this.clock,
        };
        try {
          invariant.check(context);
          invariant.readset = context.readset;
        } catch ( e ) {
          if (e instanceof errors.Runtime) {
            let msg = `Failed invariant ${invariant.name}: ${e}`;
            this.errorHandler(msg, e);
            return false;
          } else {
            throw e;
          }
        }
      }
    }
    return true;
  }

  serializeState() {
    let state = {};
    this.module.env.vars.forEach((mvar, name) => {
      if (!mvar.isConstant) {
        state[name] = mvar.toJSON();
      }
    });
    return new SerializedState(state);
  }

  restoreState(state) {
    state = state.toJSON();
    this.module.env.vars.forEach((mvar, name) => {
      if (!mvar.isConstant) {
        mvar.assignJSON(state[name]);
      }
    });
    this.reportChanges();
  }

  tryChangeState(mutator) {
    let oldState = this.execution[this.execution.length - 1].state;
    let msg = mutator();
    if (msg === undefined) {
      msg = 'state changed';
    }
    let newState = this.serializeState();
    let changes = Changesets.compareJSON(oldState.toJSON(), newState.toJSON());
    if (Changesets.empty(changes)) {
      return changes;
    } else {
      msg += ' (changed ' + changes.join(', ') + ')';
      console.log(msg);
      this.execution.push({
        msg: msg,
        state: newState,
        index: this.execution.length,
        clock: this.clock,
      });
      this.reportChanges(changes);
      this.checkInvariants();
      this.updateViews(changes);
      return changes;
    }
  }

  wouldChangeState(mutator) {
    let oldState = this.execution[this.execution.length - 1].state;
    mutator();
    let newState = this.serializeState();
    let changes = Changesets.compareJSON(oldState.toJSON(), newState.toJSON());
    if (!Changesets.empty(changes)) {
      this.restoreState(oldState);
    }
    return changes;
  }

  advanceClock(amount) {
    amount = Math.round(amount);
    this.clock += amount;
    this.reportChanges(['clock']);
    this.updateViews(['clock']);
  }

  resetToStartingState() {
    console.log('reset');
    this.module.env.vars.forEach((mvar, name) => {
      mvar.assign(mvar.type.makeDefaultValue());
    });
    this.clock = 0;
    let context = {clock: this.clock};
    this.module.ast.execute(context); // run global initialization code
    this.execution = [{
      msg: 'Reset',
      state: this.serializeState(),
      index: 0,
      clock: this.clock,
    }];
    this.resetHandler();
    this.updateViews();
  }

  restore(snapshot) {
    console.log('restore');
    this.execution = this.execution.slice(0, snapshot.index + 1);
    this.restoreState(this.execution[this.execution.length - 1].state);
    this.reportChanges();
    this.updateViews();
    this.checkInvariants();
  }

  updateViews(changes) {
    if (changes === undefined) {
      changes = [''];
    }
    let updates = [];
    let ms = qty => `${_.round(qty, 3)} ms`;
    let startAll = performance.now();
    let stop = startAll;
    this.views.forEach(view => {
      let start = stop;
      view.update(changes);
      stop = performance.now();
      updates.push(`${view.name} took ${ms(stop - start)}`);
    });
    let total = stop - startAll;
    if (total > 10) {
      console.log(`View updates took ${ms(total)}:
  ${updates.join('\n  ')}`);
    }
  }
}

Controller.ACTIVE = 1; // firing the rule would change the state
Controller.INACTIVE = 2; // firing the rule might change the state
Controller.UNKNOWN = 3; // firing the rule would not change the state

module.exports = Controller;
