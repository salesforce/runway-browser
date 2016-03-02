'use strict';

let _ = require('lodash');
let Changesets = require('./changesets.js');
let Execution = require('./execution.js');
let errors = require('./errors.js');
let RuleFor = require('./statements/rulefor.js');
let performance = {now: require('performance-now')};

class Invariant {
  constructor(context, name, source) {
    this.context = context;
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
    let econtext = {
      readset: new Set(),
      clock: this.clock,
    };
    this.source.check(econtext); // throws
    this.readset = econtext.readset;
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
  constructor(context, name, _fire) {
    this.ACTIVE = 1; // firing the rule would change the state
    this.INACTIVE = 2; // firing the rule might change the state
    this.UNKNOWN = 3; // firing the rule would not change the state

    this.context = context;
    this.name = name;
    this._fire = _fire;
    this._unknown();
  }

  _unknown() {
    this.active = this.UNKNOWN;
    this.readset = null; // valid when INACTIVE or ACTIVE
    this.nextWake = null; // valid when INACTIVE
    this.changeset = null; // valid when INACTIVE ([]) or ACTIVE
  }

  getNextWake() {
    if (this.active == this.INACTIVE) {
      return this.nextWake;
    } else {
      throw new errors.Internal('May only call getNextWake() on INACTIVE rule');
    }
  }

  fire() {
    if (this.active == this.INACTIVE) {
      return this.changeset;
    }
    let econtext = {
      readset: new Set(),
      clock: this.context.clock,
      nextWake: Number.MAX_VALUE,
    };
    let changes = this.context.tryChangeState(() => {
      this._fire(econtext);
      return this.name;
    });
    if (Changesets.empty(changes)) {
      this.active = this.INACTIVE;
      this.readset = econtext.readset;
      this.nextWake = econtext.nextWake;
      this.changeset = changes;
    } else {
      this._unknown();
    }
    return changes;
  }

  wouldChangeState() {
    if (this.active === this.ACTIVE ||
        this.active === this.INACTIVE) {
      return this.changeset;
    } else {
      //console.log(`checking if ${this.name} would change state`);
      let econtext = {
        readset: new Set(),
        clock: this.context.clock,
        nextWake: Number.MAX_VALUE,
      };
      let changes = this.context.wouldChangeState(() => {
        this._fire(econtext);
      });
      if (Changesets.empty(changes)) {
        this.active = this.INACTIVE;
        this.readset = econtext.readset;
        this.nextWake = econtext.nextWake;
        this.changeset = changes;
      } else {
        this.active = this.ACTIVE;
        this.readset = econtext.readset;
        this.nextWake = null;
        this.changeset = changes;
      }
      return changes;
    }
  }

  reportChanges(changes) {
    if (this.active === this.ACTIVE) {
      if (Changesets.affected(changes, this.readset)) {
        this._unknown();
      }
    } else if (this.active === this.INACTIVE) {
      if (Changesets.affected(changes, this.readset) ||
          this.nextWake <= this.context.clock) {
        this._unknown();
      }
    }
  }
}

class MultiRuleSet {
  constructor(context, source, name) {
    this.context = context;
    this.source = source;
    this.name = name;
    this.rulefor = true;
    this._update();
  }
  _update() {
    let econtext = {
      readset: new Set(),
      clock: this.context.clock,
    };
    let rules = [];
    this.source.expr.evaluate(econtext).forEach((v, i) => {
      rules.push(new Rule(this.context, `${this.name}(${i})`,
        econtext => this.source.fire(i, econtext)));
    });
    this.readset = econtext.readset;
    this.rules = rules;
  }
  reportChanges(changes) {
    // note that rule-for cannot access the clock for now (syntactically
    // prohibited in the modeling language)
    if (Changesets.affected(changes, this.readset)) {
      this._update();
    } else {
      this.rules.forEach(rule => rule.reportChanges(changes));
    }
  }
}

class SingleRuleSet {
  constructor(context, source, name) {
    this.context = context;
    this.source = source;
    this.name = name;
    this.rulefor = false;
    this.readset = [];
    this.rule = new Rule(this.context, name,
      econtext => this.source.fire(econtext));
    this.rules = [this.rule];
  }
  reportChanges(changes) {
    return this.rule.reportChanges(changes);
  }
}

class Context {
  constructor(controller, module, type) {
    this.controller = controller;
    this.module = module;
    this.clock = 0;
    this.type = type; // 'gen' or 'view'
  }

  _init() {
    this.cursor = this.controller.executions[0].last();
    this.invariants = this.module.env.invariants.map((invariant, name) =>
      new Invariant(this, name, invariant));
    this.checkInvariants();

    this.rulesets = this.module.env.rules.map((rule, name) => {
      if (rule instanceof RuleFor) {
        return new MultiRuleSet(this, rule, name);
      } else {
        return new SingleRuleSet(this, rule, name);
      }
    });
  }

  _reportChanges(changes) {
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

  _serializeState() {
    let state = {};
    this.module.env.vars.forEach((mvar, name) => {
      if (!mvar.isConstant) {
        state[name] = mvar.toJSON();
      }
    });
    return state;
  }

  _loadState(state) {
    this.module.env.vars.forEach((mvar, name) => {
      if (!mvar.isConstant) {
        mvar.assignJSON(state[name]);
      }
    });
  }

  tryChangeState(mutator) {
    let startCursor = this.cursor;
    let oldState = startCursor.getEvent().state;
    let msg = mutator();
    if (msg === undefined) {
      msg = 'state changed';
    }
    let newState = this._serializeState();
    let changes = Changesets.compareJSON(oldState, newState);
    if (Changesets.empty(changes)) {
      return changes;
    } else {
      msg += ' (changed ' + changes.join(', ') + ')';
      console.log(msg);
      this.cursor = startCursor.addEvent({
        msg: msg,
        state: newState,
        clock: this.clock,
        changes: changes,
      });
      if (this.controller.executions.indexOf(this.cursor.execution) === -1) {
        this.controller.executions.push(this.cursor.execution);
      }
      this.checkInvariants();
      this._reportChanges(changes);
      if (this.type == 'gen') {
        this.controller._updateViews(['execution']);
      } else {
        this.controller.genContext.reset(this.cursor, this.clock);
        this.controller._updateViews(
          Changesets.union(changes, ['execution']));
      }
      return changes;
    }
  }

  wouldChangeState(mutator) {
    let oldState = this.cursor.getEvent().state;
    mutator();
    let newState = this._serializeState();
    let changes = Changesets.compareJSON(oldState, newState);
    if (!Changesets.empty(changes)) {
      this._loadState(oldState);
    }
    return changes;
  }

  setClock(newClock) {
    newClock = Math.round(newClock);
    let oldClock = this.clock;
    let oldCursor = this.cursor;
    this.clock = newClock;
    this.cursor = oldCursor.execution.preceding(e => (e.clock <= newClock));
    if (oldCursor.equals(this.cursor)) {
      this._reportChanges(['clock:advanced']);
      if (this.type === 'view') {
        this.controller._updateViews(['clock']);
      }
      return;
    }
    let prev = this.cursor.getEvent();
    this._loadState(prev.state);
    if (oldCursor.next() !== undefined &&
        oldCursor.next().equals(this.cursor)) {
      let changes = Changesets.union(prev.changes, ['clock']);
      this._reportChanges(changes);
      if (this.type === 'view') {
        this.controller._updateViews(changes);
      }
      return;
    }
    let changes = Changesets.compareJSON(
      oldCursor.getEvent().state,
      prev.state);
    changes = Changesets.union(changes, ['clock']);
    this._reportChanges(changes);
    if (this.type === 'view') {
      this.controller._updateViews(changes);
    }
    // TODO: is this updating views twice when clocks advance AND rules fire?
  }

  reset(newCursor, newClock) {
    let newState = newCursor.getEvent().state;
    let changes = Changesets.compareJSON(
      this.cursor.getEvent().state,
      newState);
    changes = Changesets.union(changes, ['clock']);
    this._loadState(newState);
    this.cursor = newCursor;
    this.clock = newClock;
    this._reportChanges(changes);
    if (this.type === 'view') {
      this.controller._updateViews(changes);
    }
  }

  advanceClock(amount) {
    this.setClock(this.clock + amount);
  }
}

class Controller {
  constructor(module1, module2) {
    this.views = [];
    this.genContext = new Context(this, module2, 'gen');
    this.viewContext = new Context(this, module1, 'view');
    this.executions = [new Execution({
      msg: 'Initial state',
      state: this.genContext._serializeState(),
      clock: 0,
      changes: [''],
    })];
    this.genContext._init();
    this.viewContext._init();
    this.errorHandler = (msg, e) => { throw e; };
    this.resetHandler = () => {};
  }

  _updateViews(changes) {
    if (changes === undefined) {
      changes = [''];
    }
    let updates = [];
    let ms = qty => `${_.round(qty, 3)} ms`;
    let startAll = performance.now();
    let stop = startAll;
    let threshold = 10;
    this.views.forEach(view => {
      let start = stop;
      view.update(changes);
      stop = performance.now();
      if (stop - start > threshold / 3) {
        updates.push(`${view.name} took ${ms(stop - start)}`);
      }
    });
    let total = stop - startAll;
    if (total > threshold) {
      console.log(`View updates took ${ms(total)}:
  ${updates.join('\n  ')}`);
    }
  }
}

module.exports = Controller;
