/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

'use strict';

let _ = require('lodash');
let jQuery = require('jquery');
let performance = {now: require('performance-now')};
let Workspace = require('runway-compiler/lib/workspace.js').Workspace;

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

    this.highlight = [];
  }

  toggleHighlight(h) {
    if (_.isEqual(this.highlight, h)) {
      this.highlight = [];
      return false;
    } else {
      this.highlight = h;
      return true;
    }
  }

  addView(viewConstructor) {
    Promise.resolve(new viewConstructor(this))
      .then(view => this.views.push(view));
  }

  mountTab(mount, id, name) {
    if (name === undefined) {
      name = id;
    }
    id = `tab-${id}`;
    jQuery('#tabs ul.nav-tabs')
      .append(jQuery('<li>')
        .append(jQuery('<a>')
          .attr('href', '#' + id)
          .attr('data-toggle', 'tab')
          .text(name)));
    let content = jQuery('<div>')
        .addClass('tab-pane')
        .attr('id', id);
    jQuery('#tabs div.tab-content')
      .append(content);
    this._activateSomeTab();
    return mount(content[0]);
  }

  unmountTab(id) {
    id = `tab-${id}`;
    jQuery(`#tabs ul.nav-tabs li:has(a[href="#${id}"])`).remove();
    jQuery(`#tabs div.tab-pane#${id}`).remove();
    this._activateSomeTab();
  }

  _activateSomeTab() {
    if (jQuery('#tabs ul.nav-tabs .active').length === 0) {
      jQuery('#tabs ul.nav-tabs li:first').addClass('active');
      jQuery('#tabs div.tab-pane:first').addClass('active');
    }
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
