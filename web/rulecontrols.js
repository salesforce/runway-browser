"use strict";

let RuleFor = require('../statements/rulefor.js');
let jQuery = require('jquery');

class RuleControls {
  constructor(controller, elem, module) {
    this.controller = controller;
    this.elem = elem;
    this.module = module;
    this.update();

    this.elem.append(this.module.env.rules.list().map(name => {
      let group = [];
      let rule = this.module.env.rules.get(name);
      if (rule instanceof RuleFor) {
        let indextype = rule.expr.type.indextype;
        for (let i = indextype.low; i <= indextype.high; ++i) {
          group.push(jQuery('<button></button>')
            .addClass('btn')
            .addClass('btn-default')
            .html(`${name}(${i})`)
            .click(() =>
              this.controller.tryChangeState(() => rule.fire(i))));
        }
      } else {
        group.push(jQuery('<button></button>')
          .addClass('btn')
          .addClass('btn-default')
          .html(name)
          .click(() =>
            this.controller.tryChangeState(() => rule.fire())));
      }
      return jQuery('<div></div>')
        .addClass('btn-group')
        .append(group);
    }));
  }

  update() {
    // nothing to do
  }
}

module.exports = RuleControls;
