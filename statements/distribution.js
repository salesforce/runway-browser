"use strict";

let errors = require('../errors.js');
let Environment = require('../environment.js').Environment;
let makeStatement = require('./factory.js');
let makeType = require('../types/factory.js');
let Statement = require('./statement.js');
let Types = require('../types/types.js');

class Distribution extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    if (parsed.returntype) {
      this.returntype = makeType.make(parsed.returntype, this.env);
    } else {
      this.returntype = null;
    }
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
    if (this.parsed.subkind == 'function') {
      this.pure = false;
    }
    this.env.functions.set(parsed.id.value, this, this.parsed.source);
  }

  typecheck() {
    this.code.typecheck();
    return this.returntype;
  }

  typecheckApply(args) {
    if (args.length != this.params.length) {
      throw new errors.Type(`${this} takes exactly ` +
        `${this.params.length} parameters, ` +
        `${args.length} given`);
    }
    args.forEach(arg => arg.typecheck());
    this.params.forEach((param, i) => {
      let arg = args[i];
      if (!Types.subtypeOf(arg.type, param.type)) {
        throw new errors.Type(`${this} requires ` +
          `${param.type} but given ${arg.type} ` +
          `for argument ${i + 1}`);
      }
    });
  }


  execute() {}

  evaluate(args, env, gargs, context) {
    this.params.forEach((param, i) => {
      let arg = args[i];
      this.codeEnv.vars.get(param.id).assign(arg);
    });
    try {
      this.code.execute(context);
    } catch ( e ) {
      if (!(e instanceof errors.Return)) {
        throw e;
      }
      return e.value;
    }
    if (this.returntype !== null) {
      throw new errors.Internal(`No value returned from ${this.parsed.id.value}`);
    }
  }

  toString() {
    return `${this.parsed.id.value}()`;
  }
}

module.exports = Distribution;

