"use strict";

class Expression {
  constructor(parsed, env) {
    this.parsed = parsed;
    this.env = env;
  }

  evaluate() {
    throw Error(`evaluate() not implemented for ${this.parsed.kind} expression`);
  }
}

module.exports = Expression;
