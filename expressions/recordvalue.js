"use strict";

let Expression = require('./expression.js');

class RecordValue extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    let makeExpression = require('./factory.js');
    this.fields = new Map(this.parsed.fields.map((field) => [
      field.id.value,
      makeExpression(field.expr, this.env),
    ]));
  }
  // TODO: evaluate()
}

module.exports = RecordValue;
