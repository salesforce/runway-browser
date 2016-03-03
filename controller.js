'use strict';

let Changesets = require('./changesets.js');
let Execution = require('./execution.js');
let performance = {now: require('performance-now')};
let Workspace = require('./workspace.js').Workspace;

class Controller {
  constructor(module1, module2) {
    this.views = [];
    this.genContext = new Workspace(module2);
    this.viewContext = new Workspace(module1);
    this.executions = [new Execution({
      msg: 'Initial state',
      state: this.genContext._serializeState(),
      clock: 0,
      changes: [''],
    })];
    this.genContext._init(this.executions[0].last());
    this.viewContext._init(this.executions[0].last());
    this.genContext.update.sub(changes => {
      if (Changesets.affected(changes, 'execution')) {
        this._updateViews(['execution']);
      }
    });
    this.viewContext.update.sub(changes => {
      this._updateViews(changes);
    });

    let onFork = execution => {
      if (this.executions.indexOf(execution) < 0) {
        this.executions.push(execution);
      }
    };
    this.genContext.forked.sub(onFork);
    this.viewContext.forked.sub(onFork);

    this.viewContext.forked.sub(execution => {
      this.genContext.reset(this.viewContext.cursor, this.viewContext.clock);
    });
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

module.exports = {
  Controller: Controller,
};
