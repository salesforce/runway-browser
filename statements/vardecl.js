"use strict";

let makeExpression = require('../expressions/factory.js');
let makeType = require('../typefactory.js');
let Statement = require('./statement.js');

class VarDecl extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    let type = makeType(this.parsed.type, this.env);
    let value = type.makeDefaultValue();
    if (this.parsed.default !== undefined) {
      value.assign(makeExpression(this.parsed.default, this.env).evaluate());
    }
    this.env.assignVar(this.parsed.id.value, value);
  }

  execute() {
    // no-op
  }

  toString(indent) {
    return `${indent}var ${this.parsed.id.value} : ...;`;
  }
}

module.exports = VarDecl;
