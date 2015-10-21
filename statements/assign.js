"use strict";

let makeExpression = require('../expressions/factory.js');
let Statement = require('./statement.js');
let Types = require('../types.js');

class Assign extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.lhs = makeExpression(this.parsed.id, this.env); // TODO: rename to lhs in parse tree
    this.rhs = makeExpression(this.parsed.expr, this.env);
  }

  typecheck() {
    this.lhs.typecheck();
    this.rhs.typecheck();
    if (!Types.subtypeOf(this.rhs.type, this.lhs.type)) {
      throw Error(`TypeError: cannot assign ${this.rhs.type} to variable of type ${this.lhs.type}`);
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
