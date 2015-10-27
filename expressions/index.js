"use strict";

let errors = require('../errors.js');
let Expression = require('./expression.js');
let ArrayType = require('../types/array.js');

class Index extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    let makeExpression = require('./factory.js');
    this.container = makeExpression(this.parsed.parent, this.env);
    this.by = makeExpression(this.parsed.by, this.env);
  }

  typecheck() {
    this.container.typecheck();
    this.by.typecheck();
    if (!(this.container.type instanceof ArrayType)) {
      throw new errors.Type(`Can only index into Arrays (for now)`);
    }
    this.type = this.container.type.valuetype;
  // TODO: more checks
  }

  evaluate() {
    return this.container.evaluate().index(this.by.evaluate());
  }

  toString(indent) {
    return `${this.container.toString(indent)}[${this.by.toString(indent)}]`;
  }
}

module.exports = Index;

