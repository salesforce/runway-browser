"use strict";

let errors = require('../errors.js');
let Environment = require('../environment.js').Environment;
let makeStatement = require('./factory.js');
let makeType = require('../types/factory.js');
let Statement = require('./statement.js');

class Distribution extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.returntype = makeType.make(parsed.returntype, this.env);
    this.codeEnv = new Environment(this.env);
    this.code = makeStatement.make(this.parsed.code, this.codeEnv);
    this.params = this.parsed.params.map((param) => ({
      id: param.id.value,
      type: makeType.make(param.type, this.env),
      decl: param,
    }));
    this.params.forEach((param) => {
      this.codeEnv.vars.set(param.id,
        param.type.makeDefaultValue(),
        param.decl.source);
    });
    this.env.functions.set(parsed.id.value, this, this.parsed.source);
  }

  typecheck() {
    this.code.typecheck();
    return this.returntype;
  }

  execute() {
  }

  evaluate(args) {
    this.params.forEach((param, i) => {
      let arg = args[i];
      this.codeEnv.vars.get(param.id).assign(arg);
    });
    try {
      this.code.execute();
    } catch ( e ) {
      if (!(e instanceof errors.Return)) {
        throw e;
      }
      return e.value;
    }
    throw new errors.Internal(`No value returned from ${this.parsed.id.value}`);
  }
}

module.exports = Distribution;

