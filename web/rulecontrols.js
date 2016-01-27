"use strict";

let RuleFor = require('../statements/rulefor.js');
let jQuery = require('jquery');

class RuleControls {
  constructor(controller, elem, module) {
    this.controller = controller;
    this.elem = elem;
    this.module = module;
    this.update();

    let checkInvariants = () => {
      try {
        this.module.env.invariants.list().forEach(name => {
          this.module.env.invariants.get(name).check();
        });
      } catch ( e ) {
        console.log(e);
        jQuery('#error').text(e);
        throw e;
      }
    };

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
            .click(() => {
              checkInvariants();
              rule.fire(i);
              this.controller.stateChanged();
              checkInvariants();
            }));
        }
      } else {
        group.push(jQuery('<button></button>')
          .addClass('btn')
          .addClass('btn-default')
          .html(name)
          .click(() => {
            checkInvariants();
            rule.fire();
            this.controller.stateChanged();
            checkInvariants();
          }));
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
