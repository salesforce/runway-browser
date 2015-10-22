"use strict";

let errors = require('../errors.js');

class Expression {
  constructor(parsed, env) {
    this.parsed = parsed;
    this.env = env;
  }

  typecheck() {
    throw new errors.Unimplemented(`typecheck() not implemented for ${this.parsed.kind} expression`);
  }

  evaluate() {
    throw new errors.Unimplemented(`evaluate() not implemented for ${this.parsed.kind} expression`);
  }

  toString(indent) {
    throw new errors.Unimplemented(`${this.parsed.kind} is missing toString()`);
  }
}

module.exports = Expression;
