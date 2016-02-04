"use strict";

let errors = require('../errors.js');
let makeExpression = require('../expressions/factory.js');
let makeStatement = require('./factory.js');
let Statement = require('./statement.js');
let Types = require('../types/types.js');

class IfElse extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.condition = makeExpression.make(this.parsed.condition, this.env);
    this.trueStatements = makeStatement.make(this.parsed.thenblock, this.env);
    this.falseStatements = makeStatement.make(this.parsed.elseblock, this.env);
  }

  typecheck() {
    this.condition.typecheck();
    if (!Types.subtypeOf(this.condition.type, this.env.getType('Boolean'))) {
      throw new errors.Type(`Condition of if statement must be a Boolean, ` +
        `found ${this.condition.type} at ${this.condition.source}`);
    }
    this.trueStatements.typecheck();
    this.falseStatements.typecheck();
  }

  execute(context) {
    if (this.condition.evaluate(context).equals(this.env.getVar('True'))) {
      this.trueStatements.execute(context);
    } else {
      this.falseStatements.execute(context);
    }
  }

  toString(indent) {
    let next = indent + '  ';
    return `${indent}if ${this.condition.toString(indent)} {
${this.trueStatements.toString(next)}
${indent}} else {
${this.falseStatements.toString(next)}
${indent}}`;
  }
}

module.exports = IfElse;
