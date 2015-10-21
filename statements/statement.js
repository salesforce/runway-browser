"use strict";

class Statement {
  constructor(parsed, env) {
    this.parsed = parsed;
    this.env = env;
  }

  execute() {
    throw Error(`execute() not implemented for ${this.parsed.kind} statement`);
  }
}

module.exports = Statement;
