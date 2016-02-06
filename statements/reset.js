"use strict";

let errors = require('../errors.js');
let Statement = require('./statement.js');

class Reset extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
  }

  typecheck() {}

  execute() {
    throw new errors.Reset(`Uncaught reset at ${this.parsed.source}`);
  }
}

module.exports = Reset;
