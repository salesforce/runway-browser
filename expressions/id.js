"use strict";

let errors = require('../errors.js');
let Expression = require('./expression.js');

class Identifier extends Expression {
  typecheck() {
    let v = this.env.getVar(this.parsed.value);
    if (v === undefined) {
      throw new errors.Lookup(`'${this.parsed.value}' is not a variable/constant in scope`);
    }
    this.type = v.type;
  }

  evaluate() {
    let r = this.env.getVar(this.parsed.value);
    if (r === undefined) {
      throw new errors.Lookup(`'${this.parsed.value}' is not a variable/constant in scope`);
    }
    return r;
  }

  toString(indent) {
    return `${this.parsed.value}`
  }
}

module.exports = Identifier;
