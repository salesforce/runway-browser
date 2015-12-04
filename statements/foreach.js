"use strict";

let errors = require('../errors.js');
let Environment = require('../environment.js').Environment;
let makeExpression = require('../expressions/factory.js');
let makeStatement = require('./factory.js');
let Statement = require('./statement.js');
let ArrayType = require('../types/array.js');

class ForEach extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.expr = makeExpression.make(this.parsed.expr, this.env);
    this.codeEnv = new Environment(this.env);
    this.code = makeStatement.make(this.parsed.code, this.codeEnv);
  }

  typecheck() {
    this.expr.typecheck();
    if (!(this.expr.type instanceof ArrayType.Type)) {
      throw new errors.Type(`Cannot iterate on a ${this.expr.type.getName()} ` +
        `at ${this.expr.source}`);
    }
    let dummyValue = this.expr.type.valuetype.makeDefaultValue();
    this.codeEnv.vars.set(this.parsed.value.value, dummyValue);
    if (this.parsed.index !== undefined) {
      let dummyIndex = this.expr.type.indextype.makeDefaultValue();
      this.codeEnv.vars.set(this.parsed.index.value, dummyIndex);
    }
    this.code.typecheck();
  }

  execute() {
    let dummyValue = this.codeEnv.getVar(this.parsed.value.value);
    let restoreValue = () => {
      this.codeEnv.vars.shadow(this.parsed.value.value, dummyValue);
    };
    let restoreIndex = () => {
    };
    if (this.parsed.index !== undefined) {
      let dummyIndex = this.codeEnv.getVar(this.parsed.index.value);
      restoreIndex = () => {
        this.codeEnv.vars.shadow(this.parsed.index.value, dummyIndex);
      };
    }
    try {
      this.expr.evaluate().forEach((v, i) => {
        // This is a little dangerous in that it assumes that no one ever does a
        // getVar and holds onto it.
        this.codeEnv.vars.shadow(this.parsed.value.value, v);
        if (this.parsed.index !== undefined) {
          this.codeEnv.vars.shadow(this.parsed.index.value, i);
        }
        try {
          this.code.execute();
        } catch ( e ) {
          if (!(e instanceof errors.Continue)) {
            throw e;
          }
        }
      });
    } catch ( e ) {
      if (!(e instanceof errors.Break)) {
        throw e;
      }
    }
    restoreIndex();
    restoreValue();
  }
}

module.exports = ForEach;
