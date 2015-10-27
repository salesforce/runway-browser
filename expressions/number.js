"use strict";

let Expression = require('./expression.js');
let NumberType = require('../types/number.js').Type;

class NumberExpr extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    this.type = NumberType.singleton;
  }

  typecheck() {
    // no-op
  }

  evaluate() {
    let v = NumberType.singleton.makeDefaultValue();
    v.assign(this.parsed.value);
    return v;
  }

  toString(indent) {
    return `${this.parsed.value}`;
  }
}

module.exports = NumberExpr;
