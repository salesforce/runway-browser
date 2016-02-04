"use strict";

let errors = require('../errors.js');
let Environment = require('../environment.js').Environment;
let makeExpression = require('../expressions/factory.js');
let makeStatement = require('./factory.js');
let Statement = require('./statement.js');
let Types = require('../types/types.js');

class While extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.expr = makeExpression.make(this.parsed.expr, this.env);
    this.code = makeStatement.make(this.parsed.code, this.env);
  }

  typecheck() {
    this.expr.typecheck();
    if (!Types.subtypeOf(this.expr.type, this.env.getType('Boolean'))) {
      throw new errors.Type(`Expected boolean expression but got ` +
        `${this.expr.type.getName()} at ${this.expr.source}`);
    }
    this.code.typecheck();
  }

  execute(context) {
    try {
      while (this.expr.evaluate(context).equals(this.env.getVar('True'))) {
        try {
          this.code.execute(context);
        } catch ( e ) {
          if (!(e instanceof errors.Continue)) {
            throw e;
          }
        }
      }
    } catch ( e ) {
      if (!(e instanceof errors.Break)) {
        throw e;
      }
    }
  }
}

module.exports = While;
