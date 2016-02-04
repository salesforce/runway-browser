"use strict";

let errors = require('../errors.js');
let makeExpression = require('../expressions/factory.js');
let Statement = require('./statement.js');

class Return extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.expr = makeExpression.make(this.parsed.expr, this.env);
  }

  typecheck() {
    this.expr.typecheck();
  // TODO: return value should be subtype of containing function's return type
  }

  execute(context) {
    let e = new errors.Return(`Uncaught return statement at ${this.parsed.source}`);
    e.value = this.expr.type.makeDefaultValue();
    e.value.assign(this.expr.evaluate(context));
    throw e;
  }
}

module.exports = Return;
