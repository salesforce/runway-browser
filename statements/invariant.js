"use strict";

let Environment = require('../environment.js').Environment;
let Statement = require('./statement.js');
let makeStatement = require('./factory.js');

class Invariant extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.innerEnv = new Environment(this.env);
    this.inner = makeStatement.make(this.parsed.code, this.innerEnv);
    this.env.invariants.set(this.parsed.id.value, this, this.parsed.source);
  }

  typecheck() {
    this.inner.typecheck();
  }

  execute() {
    // do nothing
  }

  check() {
    this.inner.execute();
  }

  toString(indent) {
    return `${indent}invariant ${this.parsed.id.value} {
${this.inner.toString(indent + '  ')}
}`;
  }
}

module.exports = Invariant;
