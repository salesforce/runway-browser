"use strict";

let errors = require('../errors.js');

class Statement {
  constructor(parsed, env) {
    this.parsed = parsed;
    this.env = env;
  }

  typecheck() {
    throw new errors.Internal(`typecheck() not implemented for ${this.parsed.kind} statement`);
  }

  execute() {
    throw new errors.Internal(`execute() not implemented for ${this.parsed.kind} statement`);
  }

  toString(indent) {
    return `${indent}${this.parsed.kind} is missing toString();`
  }
}

module.exports = Statement;
