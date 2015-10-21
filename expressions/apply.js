"use strict";

let Expression = require('./expression.js');

class Apply extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    let makeExpression = require('./factory.js');
    this.args = this.parsed.args.map((a) => makeExpression(a, this.env));
  }

  evaluate() {
    if (this.parsed.func == '==') {
      let lhs = this.args[0].evaluate();
      let rhs = this.args[1].evaluate();
      if (lhs.equals(rhs)) {
        return this.env.getVar('True');
      } else {
        return this.env.getVar('False');
      }
    }
    throw new Error(`The function ${this.parsed.func} is not implemented`);
  }

  toString(indent) {
    let inner = this.args.map((arg) => arg.toString()).join(', ');
    return `${this.parsed.func}(${inner})`
  }
}

module.exports = Apply;
