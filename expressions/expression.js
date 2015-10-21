"use strict";

class Expression {
  constructor(parsed, env) {
    this.parsed = parsed;
    this.env = env;
  }

  typecheck() {
    throw Error(`typecheck() not implemented for ${this.parsed.kind} expression`);
  }

  evaluate() {
    throw Error(`evaluate() not implemented for ${this.parsed.kind} expression`);
  }

  toString(indent) {
    return `[${this.parsed.kind} is missing toString()]`
  }
}

module.exports = Expression;
