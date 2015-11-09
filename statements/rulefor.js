"use strict";

let makeExpression = require('../expressions/factory.js');
let Environment = require('../environment.js').Environment;
let Statement = require('./statement.js');
let ArrayType = require('../types/array.js');
let makeStatement = require('./factory.js');

class RuleFor extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.expr = makeExpression.make(this.parsed.expr, this.env);
    this.innerEnv = new Environment(this.env);
    this.inner = makeStatement.make(this.parsed.code, this.innerEnv);
    this.env.assignRule(this.parsed.id.value, this);
  }

  typecheck() {
    this.expr.typecheck();
    if (!(this.expr.type instanceof ArrayType.Type)) {
      throw new errors.Type(`Cannot iterate on a ${this.expr.type.getName()} ` +
        `at ${this.expr.source}`);
    }
    let dummyValue = this.expr.type.valuetype.makeDefaultValue();
    this.innerEnv.assignVar(this.parsed.value.value, dummyValue);
    if (this.parsed.index !== undefined) {
      let dummyIndex = this.expr.type.indextype.makeDefaultValue();
      this.innerEnv.assignVar(this.parsed.index.value, dummyIndex);
    }
    this.inner.typecheck();
  }

  execute() {
    // do nothing
  }

  fire(indexArg) {
    let index = this.expr.type.indextype.makeDefaultValue();
    if (indexArg === undefined) {
      // no index given, fire the first one
    } else {
      // index might come in as a plain JS number, but we want it in a proper
      // value.
      index.assign(indexArg);
    }

    let dummyValue = this.innerEnv.getVar(this.parsed.value.value);
    let restoreValue = () => {
      this.innerEnv.vars.set(this.parsed.value.value, dummyValue);
    };
    let restoreIndex = () => {
    };
    if (this.parsed.index !== undefined) {
      let dummyIndex = this.innerEnv.getVar(this.parsed.index.value);
      restoreIndex = () => {
        this.innerEnv.vars.set(this.parsed.index.value, dummyIndex);
      };
    }

    let array = this.expr.evaluate();
    let value = array.index(index);
    // This is a little dangerous in that it assumes that no one ever does a
    // getVar and holds onto it.
    this.innerEnv.vars.set(this.parsed.value.value, value);
    if (this.parsed.index !== undefined) {
      this.innerEnv.vars.set(this.parsed.index.value, index);
    }
    this.inner.execute();

    restoreIndex();
    restoreValue();
  }

  toString(indent) {
    return `${indent}rule ${this.parsed.id.value} for ... in ... {
${this.inner.toString(indent + '  ')}
}`;
  }
}

module.exports = RuleFor;
