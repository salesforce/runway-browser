"use strict";

let errors = require('../errors.js');
let Statement = require('./statement.js');

class Continue extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
  }

  typecheck() {}

  execute() {
    throw new errors.Continue(`Uncaught continue at ${this.parsed.source}`);
  }
}

module.exports = Continue;
