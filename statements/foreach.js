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
    let dummy = this.expr.type.valuetype.makeDefaultValue();
    this.codeEnv.assignVar(this.parsed.id.value, dummy);
    this.code.typecheck();
  }

  execute() {
    let dummy = this.codeEnv.getVar(this.parsed.id.value);
    this.expr.evaluate().forEach((v, i) => {
      // This is a little dangerous in that it assumes that no one ever does a
      // getVar and holds onto it.
      this.codeEnv.vars.set(this.parsed.id.value, v);
      this.code.execute();
    });
    this.codeEnv.vars.set(this.parsed.id.value, dummy);
  }
}

module.exports = ForEach;
