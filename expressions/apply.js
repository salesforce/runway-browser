"use strict";

let errors = require('../errors.js');
let Expression = require('./expression.js');
let Types = require('../types/types.js');
let NumberType = require('../types/number.js').Type;

class Apply extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    let makeExpression = require('./factory.js');
    this.args = this.parsed.args.map((a) => makeExpression(a, this.env));
  }

  typecheck() {
    this.args.forEach((arg) => arg.typecheck());
    if (this.parsed.func == '==') {
      this.type = this.env.getType('Boolean');
      if (this.args.length != 2) {
        throw new errors.Type(`== takes exactly two arguments`);
      }
      if (!Types.haveEquality(this.args[0].type, this.args[1].type)) {
        throw new errors.Type(`Cannot compare (${this.parsed.func}) ` +
          `${this.args[0].type} to ${this.args[1].type}`);
      }
    } else if (['<', '<=', '>', '>='].indexOf(this.parsed.func) !== -1) {
      this.type = this.env.getType('Boolean');
      if (this.args.length != 2) {
        throw new errors.Type(`== takes exactly two arguments`);
      }
      if (!Types.haveOrdering(this.args[0].type, this.args[1].type)) {
        throw new errors.Type(`Cannot compare (${this.parsed.func}) ` +
          `${this.args[0].type} to ${this.args[1].type}`);
      }
    } else if (['+', '-', '*'].indexOf(this.parsed.func) !== -1) {
      this.type = NumberType.singleton;
      if (this.args.length != 2) {
        throw new errors.Type(`== takes exactly two arguments`);
      }
      if (!Types.isNumeric(this.args[0].type) ||
        !Types.isNumeric(this.args[1].type)) {
        throw new errors.Type(`Cannot do arithmetic (${this.parsed.func}) on ` +
          `${this.args[0].type} and ${this.args[1].type}`);
      }
    } else {
      throw new errors.Unimplemented(`The function ${this.parsed.func} ` +
        `is not implemented. Called at ${this.parsed.source}`);
    }
  }

  evaluate() {
    if (this.parsed.func == '==') {
      let lhs = this.args[0].evaluate();
      let rhs = this.args[1].evaluate();
      if (lhs.equals(rhs)) {
        return this.env.getVar('True');
      } else {
        return this.env.getVar('False');
      }
    }
    throw new errors.Unimplemented(`The function ${this.parsed.func} is not implemented`);
  }

  toString(indent) {
    let inner = this.args.map((arg) => arg.toString()).join(', ');
    return `${this.parsed.func}(${inner})`
  }
}

module.exports = Apply;
