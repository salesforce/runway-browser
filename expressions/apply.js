"use strict";

let Expression = require('./expression.js');

class Apply extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    let makeExpression = require('./factory.js');
    this.args = this.parsed.args.map((a) => makeExpression(a, this.env));
  }

  evaluate() {
    return this.env.getVar('False'); // TODO
  }

  toString(indent) {
    let inner = this.args.map((arg) => arg.toString()).join(', ');
    return `${this.parsed.func}(${inner})`
  }
}

module.exports = Apply;
