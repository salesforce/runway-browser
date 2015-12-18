"use strict";

let makeExpression = require('../expressions/factory.js');
let Statement = require('./statement.js');
let errors = require('../errors.js');
let Types = require('../types/types.js');

class Assert extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.expr = makeExpression.make(this.parsed.expr, this.env);
  }

  typecheck() {
    this.expr.typecheck();
    let boolType = this.env.getType('Boolean');
    if (!Types.subtypeOf(this.expr.type, boolType)) {
      throw new errors.Type(`Cannot assert ${params[0].type}`);
    }
  }

  execute() {
    if (this.expr.evaluate() != this.env.getVar('True')) {
      throw new errors.Assertion(`Assertion failed: ${this.expr} ` +
        `at ${this.parsed.source}`);
    }
  }
}

module.exports = Assert;