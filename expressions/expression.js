"use strict";

class Expression {
  constructor(parsed, env) {
    this.parsed = parsed;
    this.env = env;
  }

  evaluate() {
    throw Error(`evaluate() not implemented for ${this.parsed.kind} expression`);
  }

  toString(indent) {
    return `[${this.parsed.kind} is missing toString()]`
  }
}

module.exports = Expression;
