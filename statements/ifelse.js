"use strict";

let makeExpression = require('../expressions/factory.js');
let Statement = require('./statement.js');

class IfElse extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    let makeStatement = require('./factory.js');
    this.condition = makeExpression(this.parsed.condition, this.env);
    this.trueStatements = makeStatement(this.parsed.thenblock, this.env);
    this.falseStatements = makeStatement(this.parsed.elseblock, this.env);
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
