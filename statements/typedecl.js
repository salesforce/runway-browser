"use strict";

let makeType = require('../types/factory.js');
let Statement = require('./statement.js');

// type T : Boolean;

class TypeDecl extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    let type = makeType.make(this.parsed.type, this.env, this.parsed.id);
    this.env.assignType(this.parsed.id.value, type);
  }

  typecheck() {
    // no-op
  }

  execute() {
    // no-op
  }

  toString(indent) {
    return `${indent}type ${this.parsed.id.value} : ...;`;
  }
}

module.exports = TypeDecl;
