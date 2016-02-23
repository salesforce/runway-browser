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

class Invariant {
  constructor(controller, name, source) {
    this.controller = controller;
    this.name = name;
    this.source = source;
    // if false, checking the invariant is a waste of time
    this.active = true;
    // if !active, a change in one of these variables will
    // make the invariant active
    this.readset = null;
  }

  check() {
    if (!this.active) {
      return false;
    }
    let context = {
      readset: new Set(),
      clock: this.clock,
    };
    this.source.check(context); // throws
    this.readset = context.readset;
  }

  reportChanges() {
    if (this.active) {
      return;
    }
    if (Changesets.affected(changes, this.readset)) {
      invariant.active = true;
      invariant.readset = null;
    }
  }
}

class Rule {
  constructor(controller, name, _fire) {
    this.ACTIVE = 1; // firing the rule would change the state
    this.INACTIVE = 2; // firing the rule might change the state
    this.UNKNOWN = 3; // firing the rule would not change the state

    this.controller = controller;
    this.name = name;
    this._fire = _fire;

    this.active = this.UNKNOWN;
    this.readset = null; // valid when INACTIVE or ACTIVE
    this.changeset = null; // valid when INACTIVE ([]) or ACTIVE
  }

  fire() {
    let context = {
      readset: new Set(),
      clock: this.controller.clock,
    };
    let changes = this.controller.tryChangeState(() => {
      this._fire(context);
      return name;
    });
    if (Changesets.empty(changes)) {
      this.active = this.INACTIVE;
      this.readset = context.readset;
      this.changeset = changes;
    } else {
      this.active = this.UNKNOWN;
      this.readset = null;
      this.changeset = null;
    }
    return changes;
  }

  wouldChangeState() {
    if (this.active === this.ACTIVE ||
        this.active === this.INACTIVE) {
      return this.changeset;
    } else {
      let context = {
        readset: new Set(),
        clock: this.controller.clock,
      };
      let changes = this.controller.wouldChangeState(() => {
        this._fire(context);
      });
      if (Changesets.empty(changes)) {
        this.active = this.INACTIVE;
        this.readset = context.readset;
        this.changeset = changes;
      } else {
        this.active = this.ACTIVE;
        this.readset = context.readset;
        this.changeset = changes;
      }
      return changes;
    }
  }

  reportChanges(changes) {
    if ((this.active === this.ACTIVE ||
         this.active === this.INACTIVE) &&
        Changesets.affected(changes, this.readset)) {
      this.active = this.UNKNOWN;
      this.readset = null;
      this.changeset = null;
    }
  }
}

class MultiRuleSet {
  constructor(controller, source, name) {
    this.controller = controller;
    this.source = source;
    this.name = name;
    this.rulefor = true;
    this._update();
  }
  _update() {
    let context = {
      readset: new Set(),
      clock: this.controller.clock,
    };
    let rules = [];
    this.source.expr.evaluate(context).forEach((v, i) => {
      rules.push(new Rule(this.controller, `${name}(${i})`,
        context => this.source.fire(i, context)));
    });
    this.readset = context.readset;
    this.rules = rules;
  }
  reportChanges(changes) {
    if (Changesets.affected(changes, this.readset)) {
      this._update();
    } else {
      this.rules.forEach(rule => rule.reportChanges(changes));
    }
  }
}

class SingleRuleSet {
  constructor(controller, source, name) {
    this.controller = controller;
    this.source = source;
    this.name = name;
    this.rulefor = false;
    this.readset = [];
    this.rule = new Rule(this.controller, name,
      context => this.source.fire(context));
    this.rules = [this.rule];
  }
  reportChanges(changes) {
    return this.rule.reportChanges(changes);
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

    this.invariants = this.module.env.invariants.map((invariant, name) =>
      new Invariant(this, name, invariant));
    this.checkInvariants();

    this.rulesets = module.env.rules.map((rule, name) => {
      if (rule instanceof RuleFor) {
        return new MultiRuleSet(this, rule, name);
      } else {
        return new SingleRuleSet(this, rule, name);
      }
    });
  }

  reportChanges(changes) {
    if (changes === undefined) {
      changes = [''];
    }

    this.invariants.forEach(invariant => invariant.reportChanges(changes));
    this.rulesets.forEach(ruleset => ruleset.reportChanges(changes));
  }

  getRulesets() {
    return this.rulesets;
  }

  checkInvariants() {
    for (let invariant of this.invariants) {
      try {
        invariant.check();
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

module.exports = Controller;
