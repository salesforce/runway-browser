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

  execute() {
    this.inner.execute();
  }
}

module.exports = Rule;
