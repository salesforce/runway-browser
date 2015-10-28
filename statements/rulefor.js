"use strict";

let makeExpression = require('../expressions/factory.js');
let Rule = require('./rule.js');
let ArrayType = require('../types/array.js');

class RuleFor extends Rule {
  constructor(parsed, env) {
    super(parsed, env);
    this.expr = makeExpression(this.parsed.expr, this.env);
  }

  typecheck() {
    this.expr.typecheck();
    if (!(this.expr.type instanceof ArrayType)) {
      throw new errors.Type(`Cannot iterate on a ${this.expr.type.getName()} ` +
        `at ${this.expr.source}`);
    }
    let dummyValue = this.expr.type.valuetype.makeDefaultValue();
    this.innerEnv.assignVar(this.parsed.value.value, dummyValue);
    if (this.parsed.index !== undefined) {
      let dummyIndex = this.expr.type.indextype.makeDefaultValue();
      this.innerEnv.assignVar(this.parsed.index.value, dummyIndex);
    }
    super.typecheck();
  }

  fire(index) {
    // index might come in as a plain JS number, but we want it in a proper
    // value.
    let iv = this.expr.type.indextype.makeDefaultValue();
    iv.assign(index);
    index = iv;

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
    super.fire();

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
