"use strict";

let makeExpression = require('../expressions/factory.js');
let makeType = require('../typefactory.js');
let Statement = require('./statement.js');
let Types = require('../types.js');

// var x : Boolean;
// var x : Boolean = False;
// var x : Boolean = (False == False);

class VarDecl extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    let type = makeType(this.parsed.type, this.env);
    this.value = type.makeDefaultValue();
    this.env.assignVar(this.parsed.id.value, this.value);
    if (this.parsed.default === undefined) {
      this.defaultExpr = null;
    } else {
      this.defaultExpr = makeExpression(this.parsed.default, this.env);
    }
  }

  typecheck() {
    if (this.defaultExpr !== null) {
      this.defaultExpr.typecheck();
      if (!Types.subtypeOf(this.defaultExpr.type, this.value.type)) {
        throw Error(`TypeError: cannot assign ${this.defaultExpr.type} to variable of type ${this.value.type}`);
      }
    }
  }

  execute() {
    if (this.defaultExpr !== null) {
      this.value.assign(this.defaultExpr.evaluate());
    }
  }

  toString(indent) {
    return `${indent}var ${this.parsed.id.value} : ...;`;
  }
}

module.exports = VarDecl;
