"use strict";

let errors = require('../errors.js');
let makeExpression = require('../expressions/factory.js');
let Statement = require('./statement.js');
let Types = require('../types/types.js');

class Assign extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.lhs = makeExpression(this.parsed.lhs, this.env);
    this.rhs = makeExpression(this.parsed.rhs, this.env);
  }

  typecheck() {
    this.lhs.typecheck();
    this.rhs.typecheck();
    if (!Types.subtypeOf(this.rhs.type, this.lhs.type)) {
      throw new errors.Type(`Cannot assign ${this.rhs.type} to variable of type ${this.lhs.type}`);
    }
  }

  execute() {
    this.lhs.evaluate().assign(this.rhs.evaluate());
  }

  toString(indent) {
    return `${indent}${this.lhs.toString(indent)} = ${this.rhs.toString(indent)};`;
  }
}

module.exports = Assign;
