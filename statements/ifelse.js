"use strict";

let makeExpression = require('../expressions/factory.js');
let Statement = require('./statement.js');
let Types = require('../types.js');

class IfElse extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    let makeStatement = require('./factory.js');
    this.condition = makeExpression(this.parsed.condition, this.env);
    this.trueStatements = makeStatement(this.parsed.thenblock, this.env);
    this.falseStatements = makeStatement(this.parsed.elseblock, this.env);
  }

  typecheck() {
    this.condition.typecheck();
    if (!Types.subtypeOf(this.condition.type, this.env.getType('Boolean'))) {
      throw Error(`Condition of if statement must be a Boolean, found ${this.condition.type}`);
    }
    this.trueStatements.typecheck();
    this.falseStatements.typecheck();
  }

  execute() {
    if (this.condition.evaluate() == this.env.getVar('True')) {
      this.trueStatements.execute();
    } else {
      this.falseStatements.execute();
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
