"use strict";

let Environment = require('../environment.js');
let Statement = require('./statement.js');
let makeStatement = require('./factory.js');

class Rule extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.innerEnv = new Environment(this.env);
    this.inner = makeStatement.make(this.parsed.code, this.innerEnv);
    if (this.env.rules === undefined) { // XXX- hack
      this.env.rules = {};
    }
    this.env.rules[this.parsed.id.value] = this;
  }

  typecheck() {
    this.inner.typecheck();
  }

  execute() {
    // do nothing
  }

  fire() {
    this.inner.execute();
  }

  toString(indent) {
    return `${indent}rule ${this.parsed.id.value} {
${this.inner.toString(indent + '  ')}
}`;
  }
}

module.exports = Rule;
