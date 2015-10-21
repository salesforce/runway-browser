"use strict";

let Expression = require('./expression.js');

class Matches extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    let makeExpression = require('./factory.js');
    this.lhs = makeExpression(this.parsed.expr, this.env);
  }

  evaluate() {
    console.log(this.parsed.variant.value);
    return this.env.getVar('False'); // TODO
  }

  toString(indent) {
    return `${this.lhs.toString(indent)} matches ${this.parsed.variant.value}`
  }
}

module.exports = Matches;
