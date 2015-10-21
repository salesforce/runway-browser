"use strict";

let Expression = require('./expression.js');

class Matches extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    let makeExpression = require('./factory.js');
    this.lhs = makeExpression(this.parsed.expr, this.env);
  }

  evaluate() {
    return this.env.getVar('False'); // TODO
  }
}

module.exports = Matches;
