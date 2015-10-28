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
    let vals = this.args.map((arg) => arg.evaluate());
    let toBool = (v) => this.env.getVar(v ? 'True' : 'False');
    let toNumber = (v) => {
      let n = NumberType.singleton.makeDefaultValue();
      n.assign(v);
      return n;
    };
    if (this.parsed.func == '==') {
      return toBool(vals[0].equals(vals[1]));
    } else if (this.parsed.func == '<') {
      return toBool(vals[0].value < vals[1].value);
    } else if (this.parsed.func == '+') {
      return toNumber(vals[0].value + vals[1].value);
    }
    throw new errors.Unimplemented(`The function ${this.parsed.func} is not implemented`);
  }

  toString(indent) {
    let inner = this.args.map((arg) => arg.toString()).join(', ');
    return `${this.parsed.func}(${inner})`
  }
}

module.exports = Apply;
