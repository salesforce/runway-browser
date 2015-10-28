"use strict";

let errors = require('../errors.js');
let Environment = require('../environment.js');
let makeExpression = require('../expressions/factory.js');
let Statement = require('./statement.js');
let ArrayType = require('../types/array.js');

class ForEach extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    let makeStatement = require('./factory.js');
    this.expr = makeExpression(this.parsed.expr, this.env);
    this.codeEnv = new Environment(this.env);
    this.code = makeStatement(this.parsed.code, this.codeEnv);
  }

  typecheck() {
    this.expr.typecheck();
    if (!(this.expr.type instanceof ArrayType)) {
      throw new errors.Type(`Cannot iterate on a ${this.expr.type.getName()} ` +
        `at ${this.expr.source}`);
    }
    let dummyValue = this.expr.type.valuetype.makeDefaultValue();
    this.codeEnv.assignVar(this.parsed.value.value, dummyValue);
    if (this.parsed.index !== undefined) {
      let dummyIndex = this.expr.type.indextype.makeDefaultValue();
      this.codeEnv.assignVar(this.parsed.index.value, dummyIndex);
    }
    this.code.typecheck();
  }

  execute() {
    let dummyValue = this.codeEnv.getVar(this.parsed.value.value);
    let restoreValue = () => {
      this.codeEnv.vars.set(this.parsed.value.value, dummyValue);
    };
    let restoreIndex = () => {
    };
    if (this.parsed.index !== undefined) {
      restoreIndex = () => {
        let dummyIndex = this.codeEnv.getVar(this.parsed.index.value);
        this.codeEnv.vars.set(this.parsed.index.value, dummyIndex);
      };
    }
    this.expr.evaluate().forEach((v, i) => {
      // This is a little dangerous in that it assumes that no one ever does a
      // getVar and holds onto it.
      this.codeEnv.vars.set(this.parsed.value.value, v);
      if (this.parsed.index !== undefined) {
        this.codeEnv.vars.set(this.parsed.index.value, i);
      }
      this.code.execute();
    });
    restoreIndex();
    restoreValue();
  }
}

module.exports = ForEach;
