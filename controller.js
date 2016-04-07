'use strict';

let performance = {now: require('performance-now')};
let Workspace = require('runway-compiler/workspace.js').Workspace;

window.viewTiming = [];

class Controller {
  constructor(module) {
    this.views = [];
    this.workspace = new Workspace(module);
    this.executions = [this.workspace.cursor.execution];
    this.workspace.update.sub(changes => {
      this._updateViews(changes);
    });

    let onFork = execution => {
      if (this.executions.indexOf(execution) < 0) {
        this.executions.push(execution);
      }
    };
    this.workspace.forked.sub(onFork);
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
      if (view.tab !== undefined &&
          !_.includes(document.getElementById(view.tab).classList, 'active')) {
        return; // hidden tab
      }
      view.update(changes);
      stop = performance.now();
      if (stop - start > threshold / 3) {
        updates.push(`${view.name} took ${ms(stop - start)}`);
      }
    });
    let total = stop - startAll;
    if (total > threshold) {
      window.viewTiming.push(`View updates took ${ms(total)}:
  ${updates.join('\n  ')}`);
      if (window.viewTiming.length > 100) {
          window.viewTiming = window.viewTiming.slice(50);
      }
    }
  }
}

module.exports = {
  Controller: Controller,
};
