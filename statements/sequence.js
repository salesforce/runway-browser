"use strict";

let Environment = require('../environment.js').Environment;
let Statement = require('./statement.js');
let makeStatement = require('./factory.js');

class Sequence extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.statements = this.parsed.statements.map((s) => makeStatement.make(s, this.env));
  }

  execute(context) {
    this.statements.forEach((s) => s.execute(context));
  }

  typecheck() {
    this.statements.forEach((s) => s.typecheck());
  }

  toString(indent) {
    if (indent === undefined) {
      indent = '';
    }
    return this.statements.map((s) => s.toString(indent)).join('\n');
  }
}

module.exports = Sequence;
