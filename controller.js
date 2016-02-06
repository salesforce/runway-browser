'use strict';

let _ = require('lodash');
let Changesets = require('./changesets.js');

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
    this.module = module;
    this.views = [];
    this.execution = [];
    this.execution.push({
      msg: 'Initial state',
      state: this.serializeState(),
      index: 0,
    });
    this.checkInvariants();
  }

  checkInvariants() {
    try {
      this.module.env.invariants.forEachLocal((invariant, name) => {
        let context = {};
        invariant.check(context);
      });
    } catch ( e ) {
      if (e instanceof errors.Runtime) {
        let msg = `Failed invariant ${name}: ${e}`;
        console.log(msg);
        jQuery('#error').text(msg);
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

  tryChangeState(mutator) {
    jQuery('#error').text('');
    this.checkInvariants();
    let oldState = this.serializeState();
    let msg = mutator();
    if (msg === undefined) {
      msg = 'state changed';
    }
    let newState = this.serializeState();
    if (oldState.equals(newState)) {
      return false;
    } else {
      msg += ' (changed ' + Changesets.compareJSON(oldState.toJSON(), newState.toJSON()).join(', ') + ')';
      console.log(msg);
      this.execution.push({
        msg: msg,
        state: newState,
        index: this.execution.length,
      });
      this.checkInvariants();
      this.updateViews();
      return true;
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
    this.tryChangeState(() => {
      console.log('reset');
      jQuery('#error').text('');
      this.module.env.vars.forEachLocal((mvar, name) => {
        mvar.assign(mvar.type.makeDefaultValue());
      });
      let context = {};
      this.module.ast.execute(context); // run global initialization code
      return 'reset';
    });
  }

  restore(snapshot) {
    console.log('restore');
    jQuery('#error').text('');
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
