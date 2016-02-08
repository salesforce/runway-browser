"use strict";

let errors = require('../errors.js');
let Expression = require('./expression.js');
let Environment = require('../environment.js');

class Identifier extends Expression {
  typecheck() {
    let v = this.env.getVar(this.parsed.value);
    if (v === undefined) {
      throw new errors.Lookup(`'${this.parsed.value}' is not a ` +
        `variable/constant in scope, ` +
        `attempted access at ${this.parsed.source}`);
    }
    this.type = v.type;
  }

  evaluate(context) {
    if (context === undefined) {
      // This is the best way to know we're threading the context through every
      // statement and expression.
      throw new errors.Internal('Evaluation context not provided');
    }
    let r = this.env.vars.get(this.parsed.value);
    if (r === undefined) {
      throw new errors.Internal(`'${this.parsed.value}' is not a ` +
        `variable/constant in scope`);
    }

    if (context.readset !== undefined && !r.isConstant) {
      let genv = this.env;
      do {
        if (genv instanceof Environment.GlobalEnvironment &&
            genv.vars.get(this.parsed.value) === r) {
          context.readset.add(this.parsed.value);
          break;
        }
        genv = genv.enclosing;
      } while (genv !== null);
    }

    return r;
  }

  toString(indent) {
    return `${this.parsed.value}`
  }
}

module.exports = Identifier;
