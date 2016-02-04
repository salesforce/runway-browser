"use strict";

let errors = require('../errors.js');
let Expression = require('./expression.js');
let Types = require('../types/types.js');
let makeExpression = require('./factory.js');

class Index extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    this.container = makeExpression.make(this.parsed.parent, this.env);
    this.by = makeExpression.make(this.parsed.by, this.env);
  }

  typecheck() {
    this.container.typecheck();
    this.by.typecheck();
    if (!Types.implementsIndexable(this.container.type)) {
      throw new errors.Type(`Can't index into ${this.container.type}`);
    }
    this.type = this.container.type.valuetype;
  // TODO: more checks
  }

  evaluate(context) {
    return this.container.evaluate(context).index(this.by.evaluate(context));
  }

  toString(indent) {
    return `${this.container.toString(indent)}[${this.by.toString(indent)}]`;
  }
}

module.exports = Index;

