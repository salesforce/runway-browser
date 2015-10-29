"use strict";

let Expression = require('./expression.js');
let makeExpression = require('./factory.js');

class Matches extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    this.lhs = makeExpression.make(this.parsed.expr, this.env);
  }

  evaluate() {
    console.log(this.parsed.variant.value);
    return this.env.getVar('False'); // TODO
  }

  typecheck() {
    // TODO: implement
    this.type = this.env.getType('Boolean');
  }

  toString(indent) {
    return `${this.lhs.toString(indent)} matches ${this.parsed.variant.value}`
  }
}

module.exports = Matches;
