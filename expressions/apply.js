"use strict";

let errors = require('../errors.js');
let Expression = require('./expression.js');
let OrderedSet = require('../types/orderedset.js');
let Types = require('../types/types.js');
let NumberType = require('../types/number.js').Type;
let RangeType = require('../types/range.js').Type;
let makeExpression = require('./factory.js');
let makeType = require('../types/factory.js');

class BaseFunction {
  constructor(name, numargs, numgargs) {
    this.name = name;
    this.numargs = numargs;
    if (numgargs === undefined) {
      this.numgargs = 0;
    } else {
      this.numgargs = numgargs;
    }
    this.pure = true;
  }
  typecheck(params, env, gargs) {
    if (gargs.length != this.numgargs) {
      throw new errors.Type(`${this.name} takes exactly ${this.numgargs} generic arguments`);
    }
    if (params.length != this.numargs) {
      throw new errors.Type(`${this.name} takes exactly ${this.numargs} arguments`);
    }
    params.forEach((param) => param.typecheck());

    if (typeof this.typecheckSub !== 'function') {
      throw new errors.Unimplemented(`The function ${this.name} ` +
        `has not implemented typecheckSub()`);
    }
    let type = this.typecheckSub(params, env, gargs);
    if (type === undefined) {
      throw new errors.Internal(`The function ${this.name} ` +
        `returned nothing in typecheckSub()`);
    }
    return type;
  }
  evaluate(args, env, gargs) {
    if (typeof this.evaluateSub !== 'function') {
      throw new errors.Unimplemented(`The function ${this.name} ` +
        `has not implemented evaluateSub()`);
    }
    let value = this.evaluateSub(args, env, gargs);
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

class BinaryBooleanFunction extends BaseFunction {
  constructor(name) {
    super(name, 2);
    this.shortCircuit = true;
  }
  typecheckSub(params, env) {
    let type = env.getType('Boolean');
    if (!Types.subtypeOf(params[0].type, type)) {
      throw new errors.Type(`${this.name} only works on Boolean ` +
        `but given ${params[0].type}`);
    }
    if (!Types.subtypeOf(params[0].type, type)) {
      throw new errors.Type(`${this.name} only works on Boolean ` +
        `but given ${params[1].type}`);
    }
    return type;
  }
}

class AndFunction extends BinaryBooleanFunction {
  constructor() {
    super('&&');
  }
  evaluateSub(args, env) {
    if (args[0].evaluate().equals(env.getVar('True'))) {
      return args[1].evaluate();
    } else {
      return env.getVar('False');
    }
  }
}

class OrFunction extends BinaryBooleanFunction {
  constructor() {
    super('||');
  }
  evaluateSub(args, env) {
    let True = env.getVar('True');
    if (args[0].evaluate().equals(True)) {
      return True;
    } else {
      return args[1].evaluate();
    }
  }
}

class OrderingFunction extends BaseFunction {
  constructor(name, nativeFn) {
    super(name, 2);
    this.nativeFn = nativeFn;
  }
  typecheckSub(params, env) {
    if (!Types.haveOrdering(params[0].type, params[1].type)) {
      throw new errors.Type(`Cannot compare (${this.name}) ` +
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
      throw new errors.Type(`Cannot do arithmetic (${this.name}) on ` +
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

class RemoveFunction extends BaseFunction {
  constructor() {
    super('remove', 2);
    this.pure = false;
  }
  typecheckSub(params, env) {
    if (!(params[0].type instanceof OrderedSet.Type)) {
      throw new errors.Type(`Cannot call remove() on ${params[0].type}`);
    }
    if (!Types.subtypeOf(params[1].type, params[0].type.valuetype)) {
      throw new errors.Type(`Cannot call remove() on ${params[0].type} ` +
        `with ${params[1].type}`);
    }
    return env.getType('Boolean');
  }
  evaluateSub(args, env) {
    return env.getVar(args[0].remove(args[1]) ? 'True' : 'False');
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

class FullFunction extends BaseFunction {
  constructor() {
    super('full', 1);
  }
  typecheckSub(params, env) {
    if (!(params[0].type instanceof OrderedSet.Type)) {
      throw new errors.Type(`Cannot call empty() on ${params[0].type}`);
    }
    return env.getType('Boolean');
  }
  evaluateSub(args, env) {
    return env.getVar(args[0].full() ? 'True' : 'False');
  }
}

class URandomFunction extends BaseFunction {
  constructor() {
    super('urandom', 0, 1);
  }
  typecheckSub(params, env, gargs) {
    if (!(gargs[0] instanceof RangeType)) {
      throw new errors.type(`Need RangeType as generic argument to urandom`);
    }
    return gargs[0];
  }
  evaluateSub(args, env, gargs) {
    let range = gargs[0];
    let number = range.low + Math.floor(Math.random() *
      (range.high - range.low + 1));
    let value = gargs[0].makeDefaultValue();
    value.assign(number);
    return value;
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
  new RemoveFunction(),
  new ContainsFunction(),
  new EmptyFunction(),
  new FullFunction(),
  new AndFunction(),
  new OrFunction(),
  new URandomFunction(),
];

class Apply extends Expression {
  constructor(parsed, env) {
    super(parsed, env);
    if (this.parsed.genericargs === undefined) {
      this.gargs = [];
    } else {
      this.gargs = this.parsed.genericargs.map((a) => makeType.make(a, this.env));
    }
    this.args = this.parsed.args.map((a) => makeExpression.make(a, this.env));
    this.fn = undefined;
  }

  typecheck() {
    functions.forEach((fn) => {
      if (fn.name == this.parsed.func.value) {
        this.fn = fn;
      }
    });
    if (this.fn === undefined) {
      this.fn = this.env.functions.get(this.parsed.func.value);
    }
    if (this.fn === undefined) {
      throw new errors.Unimplemented(`The function ` +
        `${this.parsed.func.value} is not implemented. ` +
        `Called at ${this.parsed.source}`);
    }
    this.type = this.fn.typecheck(this.args, this.env, this.gargs);
  }

  evaluate() {
    let args = this.args;
    if (this.fn.shortCircuit !== true) {
      args = this.args.map((arg) => arg.evaluate());
    }
    return this.fn.evaluate(args, this.env, this.gargs);
  }

  toString(indent) {
    let inner = this.args.map((arg) => arg.toString()).join(', ');
    return `${this.parsed.func.value}(${inner})`
  }
}

module.exports = Apply;
