"use strict";

let errors = require('../errors.js');
let Expression = require('./expression.js');
let Types = require('../types/types.js');
let NumberType = require('../types/number.js').Type;
let makeExpression = require('./factory.js');

class BaseFunction {
  constructor(name, numargs) {
    this.name = name;
    this.numargs = numargs;
  }
  typecheck(params, env) {
    if (params.length != this.numargs) {
      throw new errors.Type(`${this.name} takes exactly ${this.numargs} arguments`);
    }
    params.forEach((param) => param.typecheck());

    if (typeof this.typecheckSub !== 'function') {
      throw new errors.Unimplemented(`The function ${this.name} ` +
        `has not implemented typecheckSub()`);
    }
    let type = this.typecheckSub(params, env);
    if (type === undefined) {
      throw new errors.Internal(`The function ${this.name} ` +
        `returned nothing in typecheckSub()`);
    }
    return type;
  }
  evaluate(args, env) {
    if (typeof this.evaluateSub !== 'function') {
      throw new errors.Unimplemented(`The function ${this.name} ` +
        `has not implemented evaluateSub()`);
    }
    let value = this.evaluateSub(args, env);
    if (value === undefined) {
      throw new errors.Internal(`The function ${this.name} ` +
        `returned nothing in evaluateSub()`);
    }
    return value;
  }
}

class NegateFunction extends BaseFunction {
  constructor() {
    super('!', 1);
  }
  typecheckSub(params, env) {
    let boolType = env.getType('Boolean');
    if (!Types.subtypeOf(params[0].type, boolType)) {
      throw new errors.Type(`Cannot negate ${params[0].type}`);
    }
    return boolType;
  }
  evaluateSub(args, env) {
    let isFalse = (args[0] === env.getVar('False'));
    return env.getVar(isFalse ? 'True' : 'False');
  }
}
;

class EqualityFunction extends BaseFunction {
  typecheckSub(params, env) {
    if (!Types.haveEquality(params[0].type, params[1].type)) {
      throw new errors.Type(`Cannot compare (${this.name}) ` +
        `${params[0].type} to ${params[1].type}`);
    }
    return env.getType('Boolean');
  }
}

class EqualsFunction extends EqualityFunction {
  constructor() {
    super('==', 2);
  }
  evaluateSub(args, env) {
    let eq = args[0].equals(args[1]);
    return env.getVar(eq ? 'True' : 'False');
  }
}

class NotEqualsFunction extends EqualityFunction {
  constructor() {
    super('!=', 2);
  }
  evaluateSub(args, env) {
    let eq = args[0].equals(args[1]);
    return env.getVar(eq ? 'False' : 'True');
  }
}

class OrderingFunction extends BaseFunction {
  constructor(name, nativeFn) {
    super(name, 2);
    this.nativeFn = nativeFn;
  }
  typecheckSub(params, env) {
    if (!Types.haveOrdering(params[0].type, params[1].type)) {
      throw new errors.Type(`Cannot compare (${this.parsed.func}) ` +
        `${params[0].type} to ${params[1].type}`);
    }
    return env.getType('Boolean');
  }
  evaluateSub(args, env) {
    let result = this.nativeFn(args[0].value, args[1].value);
    return env.getVar(result ? 'True' : 'False');
  }
}

class ArithmeticFunction extends BaseFunction {
  constructor(name, nativeFn) {
    super(name, 2);
    this.nativeFn = nativeFn;
  }
  typecheckSub(params, env) {
    if (!Types.isNumeric(params[0].type) ||
      !Types.isNumeric(params[1].type)) {
      throw new errors.Type(`Cannot do arithmetic (${this.parsed.func}) on ` +
        `${params[0].type} and ${params[1].type}`);
    }
    return NumberType.singleton;
  }
  evaluateSub(args, env) {
    let toNumber = (v) => {
      let n = NumberType.singleton.makeDefaultValue();
      n.assign(v);
      return n;
    };
    return toNumber(this.nativeFn(args[0].value, args[1].value));
  }
}

let functions = [
  new NegateFunction(),
  new EqualsFunction(),
  new NotEqualsFunction(),
  new OrderingFunction('<', (x, y) => (x < y)),
  new OrderingFunction('<=', (x, y) => (x <= y)),
  new OrderingFunction('>=', (x, y) => (x >= y)),
  new OrderingFunction('>', (x, y) => (x > y)),
  new ArithmeticFunction('+', (x, y) => (x + y)),
  new ArithmeticFunction('-', (x, y) => (x - y)),
  new ArithmeticFunction('*', (x, y) => (x * y)),
];

class Apply extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    this.params = this.parsed.args.map((a) => makeExpression.make(a, this.env));
  }

  typecheck() {
    let done = false;
    functions.forEach((fn) => {
      if (fn.name == this.parsed.func) {
        this.type = fn.typecheck(this.params, this.env);
        done = true;
      }
    });
    if (!done) {
      throw new errors.Unimplemented(`The function ${this.parsed.func} ` +
        `is not implemented. Called at ${this.parsed.source}`);
    }
  }

  evaluate() {
    let args = this.params.map((param) => param.evaluate());
    let value = null;
    functions.forEach((fn) => {
      if (fn.name == this.parsed.func) {
        value = fn.evaluate(args, this.env);
      }
    });
    if (value === null) {
      throw new errors.Unimplemented(`The function ${this.parsed.func} is ` +
        `not implemented`);
    }
    return value;
  }

  toString(indent) {
    let inner = this.params.map((param) => param.toString()).join(', ');
    return `${this.parsed.func}(${inner})`
  }
}

module.exports = Apply;
