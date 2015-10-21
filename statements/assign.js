"use strict";

let makeExpression = require('../expressions/factory.js');
let Statement = require('./statement.js');

class Assign extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    // this.lhs = makeExpression
    this.rhs = makeExpression(this.parsed.expr, this.env);
  }

  execute() {
    this.env.getVar(this.parsed.id.value).assign(this.rhs.evaluate());
  }
}

module.exports = Assign;
