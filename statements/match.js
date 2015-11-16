"use strict";

let errors = require('../errors.js');
let Environment = require('../environment.js').Environment;
let makeExpression = require('../expressions/factory.js');
let makeStatement = require('./factory.js');
let Statement = require('./statement.js');
let EitherType = require('../types/either.js').Type;

class Match extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.expr = makeExpression.make(this.parsed.expr, this.env);
    this.variants = new Map(this.parsed.variants.map((variant) => {
      let variantEnv = new Environment(this.env);
      return [variant.type.value,
        {
          id: variant.id,
          code: makeStatement.make(variant.code, variantEnv),
          env: variantEnv,
        }]
    }));
  }

  typecheck() {
    this.expr.typecheck();
    if (!(this.expr.type instanceof EitherType)) {
      throw new errors.Type(`Cannot match on a ${this.expr.type.getName()} ` +
        `at ${this.expr.source}`);
    }
    this.variants.forEach((variant, tag) => {
      if (variant.id !== undefined) {
        let value = this.expr.type.getVariant(tag).makeDefaultValue();
        variant.env.vars.set(variant.id.value, value);
      }
      variant.code.typecheck();
    });
  }

  execute() {
    let value = this.expr.evaluate();
    let variant = this.variants.get(value.varianttype.name);
    if (variant === undefined) {
      throw new errors.Internal(`Bad variant: ${value.varianttype.name}`);
    }
    if (variant.id !== undefined) {
      variant.env.getVar(variant.id.value).assign(value);
    }
    variant.code.execute();
  }

  toString(indent) {
    return `${indent}match ${this.expr.toString(indent)} {
${indent}  ...
${indent}}`;
  }
}

module.exports = Match;
