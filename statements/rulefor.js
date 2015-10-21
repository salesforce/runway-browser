"use strict";

let makeExpression = require('../expressions/factory.js');
let Rule = require('./rule.js');

class RuleFor extends Rule {
  constructor(parsed, env) {
    super(parsed, env);
    // TODO: huge hacks. indexing just 1. inserting placeholder of False for now.
    this.expr = makeExpression(
      {
        kind: 'index',
        parent: this.parsed.expr,
        by: {
          kind: 'number',
          value: 1
        }
      }, this.env);
    this.innerEnv.assignVar(this.parsed.variable.value, this.env.getVar('False'));
  }

  typecheck() {
    this.expr.typecheck();
    super.typecheck();
  }

  execute() {
    // TODO: hack for now. Should be assign() into result of getVar().
    //this.innerEnv.getVar(this.parsed.variable.value).assign(this.expr.evaluate());
    this.innerEnv.vars.set(this.parsed.variable.value, this.expr.evaluate());
    super.execute();
  }

  toString(indent) {
    return `${indent}rule ${this.parsed.id.value} for ... in ... {
${this.inner.toString(indent + '  ')}
}`;
  }
}

module.exports = RuleFor;
