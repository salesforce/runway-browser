"use strict";

let Statement = require('./statement.js');

class Rule extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    let makeStatement = require('./factory.js');
    this.inner = makeStatement(this.parsed.code, this.env);
    if (this.env.rules === undefined) { // XXX- hack
      this.env.rules = {};
    }
    this.env.rules[this.parsed.id.value] = this;
  }

  typecheck() {
    this.inner.typecheck();
  }

  execute() {
    this.inner.execute();
  }

  toString(indent) {
    return `${indent}rule ${this.parsed.id.value} {
${this.inner.toString(indent + '  ')}
}`;
  }
}

module.exports = Rule;
