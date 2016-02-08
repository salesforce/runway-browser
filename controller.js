'use strict';

let _ = require('lodash');
let Changesets = require('./changesets.js');
let errors = require('./errors.js');

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
    this.execution = [{
      msg: 'Initial state',
      state: this.serializeState(),
      index: 0,
    }];
    this.checkInvariants();
  }

  checkInvariants() {
    try {
      this.module.env.invariants.forEachLocal((invariant, name) => {
        let context = {};
        invariant.check(context);
      });
      return true;
    } catch ( e ) {
      if (e instanceof errors.Runtime) {
        let msg = `Failed invariant ${name}: ${e}`;
        this.errorHandler(msg, e);
        return false;
      } else {
        throw e;
      }
    }
  }

  serializeState() {
    let state = {};
    this.module.env.vars.forEachLocal((mvar, name) => {
      if (!mvar.isConstant) {
        state[name] = mvar.toJSON();
      }
    });
    return new SerializedState(state);
  }

  restoreState(state) {
    state = state.toJSON();
    this.module.env.vars.forEachLocal((mvar, name) => {
      if (!mvar.isConstant) {
        mvar.assignJSON(state[name]);
      }
    });
  }

  tryChangeState(mutator, checkInvariantsReplacement) {
    let oldState = this.execution[this.execution.length - 1].state;
    let msg = mutator();
    if (msg === undefined) {
      msg = 'state changed';
    }
    let newState = this.serializeState();
    let changes = Changesets.compareJSON(oldState.toJSON(), newState.toJSON());
    if (!changes) {
      return false;
    } else {
      msg += ' (changed ' + changes.join(', ') + ')';
      console.log(msg);
      this.execution.push({
        msg: msg,
        state: newState,
        index: this.execution.length,
      });
      if (checkInvariantsReplacement === undefined) {
        this.checkInvariants();
      } else {
        checkInvariantsReplacement(changes);
      }
      this.updateViews();
      return changes;
    }
  }

  wouldChangeState(mutator) {
    let oldState = this.serializeState();
    mutator();
    let newState = this.serializeState();
    if (oldState.equals(newState)) {
      return false;
    } else {
      this.restoreState(oldState);
      return true;
    }
  }

  resetToStartingState() {
    console.log('reset');
    this.module.env.vars.forEachLocal((mvar, name) => {
      mvar.assign(mvar.type.makeDefaultValue());
    });
    let context = {};
    this.module.ast.execute(context); // run global initialization code
    this.execution = [{
      msg: 'Reset',
      state: this.serializeState(),
      index: 0,
    }];
    this.resetHandler();
    this.updateViews();
  }

  restore(snapshot) {
    console.log('restore');
    this.execution = this.execution.slice(0, snapshot.index + 1);
    this.restoreState(this.execution[this.execution.length - 1].state);
    this.checkInvariants();
    this.updateViews();
  }

  updateViews() {
    this.views.forEach(view => view.update());
  }
}

module.exports = Controller;
