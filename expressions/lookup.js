"use strict";

let errors = require('../errors.js');
let Expression = require('./expression.js');
let RecordType = require('../types/record.js');
let Either = require('../types/either.js');
let makeExpression = require('./factory.js');

class Lookup extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    this.parent = makeExpression.make(this.parsed.parent, this.env);
  }

  typecheck() {
    this.parent.typecheck();
    if (this.parent.type instanceof RecordType ||
      this.parent.type instanceof Either.Variant) {
    } else {
      let hint = '';
      if (this.parent.type instanceof Either.Type) {
        hint = ': use a match statement?';
      }
      throw new errors.Type(`Cannot lookup field in ${this.parent} which is a ` +
        `${this.parent.type}${hint} ` +
        `(defined at ${this.parent.parsed.source})`);
    }
    this.type = this.parent.type.fieldType(this.parsed.child.value);
    if (this.type === undefined) {
      throw new errors.Type(`${this.parent.type} has no field ${this.parsed.child.value}`);
    }
  }

  evaluate(context) {
    let parval = this.parent.evaluate(context);
    if (parval === undefined) {
      throw new errors.Internal(`Expr ${this.parent} evaluated to undefined`);
    }
    return parval.lookup(this.parsed.child.value);
  }

  toString(indent) {
    return `${this.parent.toString(indent)}.${this.parsed.child.value}`;
  }
}

module.exports = Lookup;

