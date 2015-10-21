"use strict";

let Expression = require('./expression.js');

class Identifier extends Expression {
  typecheck() {
    this.type = this.env.getVar(this.parsed.value).type;
  }

  evaluate() {
    let r = this.env.getVar(this.parsed.value);
    if (r === undefined) {
      throw Error(`'${this.parsed.value}' is not a variable/constant in scope`);
    }
    return r;
  }

  toString(indent) {
    return `${this.parsed.value}`
  }
}

module.exports = Identifier;
