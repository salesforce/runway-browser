"use strict";

let errors = require('../errors.js');
let makeExpression = require('../expressions/factory.js');
let Statement = require('./statement.js');

class Do extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.expr = makeExpression.make(this.parsed.expr, this.env);
  }

  typecheck() {
    this.expr.typecheck();
    if (this.parsed.expr.kind != 'apply' ||
      this.expr.fn.pure !== false) {
      throw new errors.Type(`Statement has no effect ` +
        `at ${this.parsed.source}`);
    }
  }

  execute(context) {
    this.expr.evaluate(context);
  }
}

module.exports = Do;
