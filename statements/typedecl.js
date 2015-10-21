"use strict";

let makeType = require('../typefactory.js');
let Statement = require('./statement.js');

class TypeDecl extends Statement {
  constructor(parsed, env) {
    super(parsed, env);
    this.env.assignType(this.parsed.id.value, makeType(this.parsed.type, this.env, this.parsed.id));
  }

  execute() {
    // no-op
  }
}

module.exports = TypeDecl;
