"use strict";

let Expression = require('./expression.js');

class Index extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    let makeExpression = require('./factory.js');
    this.container = makeExpression(this.parsed.parent, this.env);
    this.by = makeExpression(this.parsed.by, this.env);
  }

  toString(indent) {
    return `${this.container.toString(indent)}[${this.by.toString(indent)}]`;
  }
}

module.exports = Index;

