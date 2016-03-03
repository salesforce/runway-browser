'use strict';

let _ = require('lodash');
let Changesets = require('./changesets.js');
let Execution = require('./execution.js');
let errors = require('./errors.js');
let RuleFor = require('./statements/rulefor.js');
let PubSub = require('./pubsub.js');

class Invariant {
  constructor(workspace, name, source) {
    this.workspace = workspace;
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
  constructor(workspace, name, _fire) {
    this.ACTIVE = 1; // firing the rule would change the state
    this.INACTIVE = 2; // firing the rule might change the state
    this.UNKNOWN = 3; // firing the rule would not change the state

    this.workspace = workspace;
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
      clock: this.workspace.clock,
      nextWake: Number.MAX_VALUE,
    };
    let changes = this.workspace.tryChangeState(() => {
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
        clock: this.workspace.clock,
        nextWake: Number.MAX_VALUE,
      };
      let changes = this.workspace.wouldChangeState(() => {
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
          this.nextWake <= this.workspace.clock) {
        this._unknown();
      }
    }
  }
}

class MultiRuleSet {
  constructor(workspace, source, name) {
    this.workspace = workspace;
    this.source = source;
    this.name = name;
    this.rulefor = true;
    this._update();
  }
  _update() {
    let econtext = {
      readset: new Set(),
      clock: this.workspace.clock,
    };
    let rules = [];
    this.source.expr.evaluate(econtext).forEach((v, i) => {
      rules.push(new Rule(this.workspace, `${this.name}(${i})`,
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
  constructor(workspace, source, name) {
    this.workspace = workspace;
    this.source = source;
    this.name = name;
    this.rulefor = false;
    this.readset = [];
    this.rule = new Rule(this.workspace, name,
      econtext => this.source.fire(econtext));
    this.rules = [this.rule];
  }
  reportChanges(changes) {
    return this.rule.reportChanges(changes);
  }
}

class Workspace {
  constructor(module) {
    this.module = module;
    this.clock = 0;
    this.update = new PubSub();
    this.forked = new PubSub();
    this.postReset = new PubSub();
    this.invariantError = new PubSub();
    this.cursor = new Execution({
      msg: 'Initial state',
      state: this._serializeState(),
      clock: this.clock,
      changes: [''],
    }).last();
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
    this.update.sub(changes => {
      if (changes === undefined) {
        changes = [''];
      }
      this.invariants.forEach(invariant => invariant.reportChanges(changes));
      this.rulesets.forEach(ruleset => ruleset.reportChanges(changes));
    });
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
          this.invariantError.pub(msg, e);
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
      this.checkInvariants();
      if (this.cursor.execution !== startCursor.execution) {
        this.forked.pub(this.cursor.execution);
      }
      this.update.pub(Changesets.union(changes, ['execution']));
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
      this.update.pub(['clock:advanced']);
      return;
    }
    let prev = this.cursor.getEvent();
    this._loadState(prev.state);
    if (oldCursor.next() !== undefined &&
        oldCursor.next().equals(this.cursor)) {
      let changes = Changesets.union(prev.changes, ['clock']);
      this.update.pub(changes);
      return;
    }
    let changes = Changesets.compareJSON(
      oldCursor.getEvent().state,
      prev.state);
    changes = Changesets.union(changes, ['clock']);
    this.update.pub(changes);
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
    this.postReset.pub(changes);
    this.update.pub(changes);
  }

  advanceClock(amount) {
    this.setClock(this.clock + amount);
  }
}

module.exports = {
  Workspace: Workspace,
};
