/*
 * Copyright (c) 2015-2016, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the MIT license.
 * For full license text, see LICENSE.md file in the repo root or
 * https://opensource.org/licenses/MIT
 */

'use strict';

let d3 = require('d3');
let Changesets = require('runway-compiler/lib/changesets.js');

class Menu {
  constructor(namespace, controller, model) {
    this.namespace = namespace;
    this.controller = controller;
    this.model = model;

    d3.select(window).on(`click.${namespace}menus`, () => this.closeAll());
    this.parentSel = d3.select('body')
      .append('div');
    this.menuSel = this.parentSel
        .append('ul')
          .attr('id', 'context-menu')
          .attr('class', 'dropdown-menu');
  }

  open(actions, event) {
    if (event === undefined) {
      event = d3.event;
    }
    event.stopPropagation();
    this.closeAll();
    this.parentSel
      .classed('open', true);
    this.menuSel
      .style('top', event.pageY)
      .style('left', event.pageX);
    let defaultContext = {
      clock: this.controller.workspace.clock,
      async: true,
    };
    actions.forEach(action => {
      if (action.context === undefined) {
        action.context = defaultContext;
      }
      if (action.action === undefined) {
        action.action = () => {
          this.model.rules.get(action.rule).fire(action.args, action.context);
        };
      }
      if (action.disabled === undefined) {
        action.disabled = Changesets.empty(
          this.controller.workspace.wouldChangeState(action.action));
      }
      if (action.label === undefined) {
        action.label = action.rule;
      }
      this.menuSel
        .append('li')
          .classed('disabled', action.disabled)
          .append('a')
            .classed('clickable', true)
            .on('click', () => {
              this.closeAll();
              this.controller.workspace.tryChangeState(action.action);
            })
            .text(action.label);
    });
  }

  closeAll() {
    this.parentSel
      .classed('open', false);
    this.menuSel
      .selectAll('li')
      .remove();
  }

  destroy() {
    this.parentSel.remove();
  }
}

module.exports = Menu;
