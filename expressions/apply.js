"use strict";

let errors = require('../errors.js');
let Expression = require('./expression.js');
let OrderedSet = require('../types/orderedset.js');
let Types = require('../types/types.js');
let NumberType = require('../types/number.js').Type;
let makeExpression = require('./factory.js');

class BaseFunction {
  constructor(name, numargs) {
    this.name = name;
    this.numargs = numargs;
    this.pure = true;
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

class PushFunction extends BaseFunction {
  constructor() {
    super('push', 2);
    this.pure = false;
  }
  typecheckSub(params, env) {
    if (!(params[0].type instanceof OrderedSet.Type)) {
      throw new errors.Type(`Cannot call push() on ${params[0].type}`);
    }
    if (!Types.subtypeOf(params[1].type, params[0].type.valuetype)) {
      throw new errors.Type(`Cannot call push() on ${params[0].type} ` +
        `with ${params[1].type}`);
    }
    return env.getType('Boolean'); // TODO: unit
  }
  evaluateSub(args, env) {
    args[0].push(args[1]);
    return env.getVar('True'); // TODO: unit
  }
}

class PopFunction extends BaseFunction {
  constructor() {
    super('pop', 1);
    this.pure = false;
  }
  typecheckSub(params, env) {
    if (!(params[0].type instanceof OrderedSet.Type)) {
      throw new errors.Type(`Cannot call pop() on ${params[0].type}`);
    }
    return params[0].type.valuetype;
  }
  evaluateSub(args, env) {
    return args[0].pop();
  }
}

class ContainsFunction extends BaseFunction {
  constructor() {
    super('contains', 2);
  }
  typecheckSub(params, env) {
    if (!(params[0].type instanceof OrderedSet.Type)) {
      throw new errors.Type(`Cannot call contains() on ${params[0].type}`);
    }
    if (!Types.subtypeOf(params[1].type, params[0].type.valuetype)) {
      throw new errors.Type(`Cannot call contains() on ${params[0].type} ` +
        `with ${params[1].type}`);
    }
    return env.getType('Boolean');
  }
  evaluateSub(args, env) {
    return env.getVar(args[0].contains(args[1]) ? 'True' : 'False');
  }
}

class EmptyFunction extends BaseFunction {
  constructor() {
    super('empty', 1);
  }
  typecheckSub(params, env) {
    if (!(params[0].type instanceof OrderedSet.Type)) {
      throw new errors.Type(`Cannot call empty() on ${params[0].type}`);
    }
    return env.getType('Boolean');
  }
  evaluateSub(args, env) {
    return env.getVar(args[0].empty() ? 'True' : 'False');
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
  new ArithmeticFunction('pow', (x, y) => Math.pow(x, y)),
  new PushFunction(),
  new PopFunction(),
  new ContainsFunction(),
  new EmptyFunction(),
];

class Apply extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    this.params = this.parsed.args.map((a) => makeExpression.make(a, this.env));
    this.fn = undefined;
    functions.forEach((fn) => {
      if (fn.name == this.parsed.func.value) {
        this.fn = fn;
      }
    });
    if (this.fn === undefined) {
      throw new errors.Unimplemented(`The function ` +
        `${this.parsed.func.value} is not implemented. ` +
        `Called at ${this.parsed.source}`);
    }
  }

  typecheck() {
    this.type = this.fn.typecheck(this.params, this.env);
  }

  evaluate() {
    let args = this.params.map((param) => param.evaluate());
    return this.fn.evaluate(args, this.env);
  }

  toString(indent) {
    let inner = this.params.map((param) => param.toString()).join(', ');
    return `${this.parsed.func.value}(${inner})`
  }
}

module.exports = Apply;
