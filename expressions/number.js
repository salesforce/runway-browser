"use strict";

let Expression = require('./expression.js');

class NumberExpr extends Expression {
  evaluate() {
    return this.parsed.value;
  }
}

module.exports = NumberExpr;
