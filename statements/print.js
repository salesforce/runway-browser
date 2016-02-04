"use strict";

let makeExpression = require('../expressions/factory.js');
let Statement = require('./statement.js');

class Print extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.expr = makeExpression.make(this.parsed.expr, this.env);
  }

  typecheck() {
    this.expr.typecheck();
  }

  execute(context) {
    console.log(this.expr.evaluate(context).toString());
  }
}

module.exports = Print;
