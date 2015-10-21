"use strict";

let Environment = require('../environment.js');
let Statement = require('./statement.js');

class Sequence extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    let makeStatement = require('./factory.js');
    // XXX- Would like to do the following but need to export top-level names.
    // Maybe module should differ from sequence?
    // this.innerEnv = new Environment(this.env);
    this.statements = this.parsed.statements.map((s) => makeStatement(s, this.env));
  }

  execute() {
    this.statements.forEach((s) => s.execute());
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
