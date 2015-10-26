"use strict";

let Expression = require('./expression.js');
let NumberType = require('../types/number.js');

class NumberExpr extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    this.type = NumberType.singleton;
  }

  typecheck() {
    // no-op
  }

  evaluate() {
    return this.parsed.value;
  }

  toString(indent) {
    return `${this.parsed.value}`;
  }
}

module.exports = NumberExpr;
