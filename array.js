"use strict";

let Type = require('./type.js');
let Value = require('./value.js');

class ArrayValue extends Value {
  constructor(type) {
    super(type);
    let length = type.indextype.high - type.indextype.low + 1;
    this.items = Array.from({
      length: length
    },
      () => this.type.valuetype.makeDefaultValue());
  }
  toString() {
    let inner = this.items.map((v, i) => {
      return `${this.type.indextype.low + i}: ${v.toString()}`;
    }).join(', ');
    return `[${inner}]`;
  }
}

class ArrayType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    let makeType = require('./typefactory.js');
    this.valuetype = makeType(this.decl.args[0], this.env);
    this.indextype = makeType(this.decl.indexBy, this.env);
  }
  makeDefaultValue() {
    return new ArrayValue(this);
  }
}

module.exports = ArrayType;
