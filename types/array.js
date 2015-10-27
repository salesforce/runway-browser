"use strict";

let Type = require('./type.js');
let Value = require('./value.js');
let errors = require('../errors.js');

class ArrayValue extends Value {
  constructor(type) {
    super(type);
    let length = this.type.indextype.high - this.type.indextype.low + 1;
    this.items = Array.from({
      length: length
    },
      () => this.type.valuetype.makeDefaultValue());
  }
  index(i) {
    if (i < this.type.indextype.low || i > this.type.indextype.high) {
      throw new errors.Bounds(`Cannot access index ${i} of ${this}`);
    }
    return this.items[i - this.type.indextype.low];
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
    let makeType = require('./factory.js');
    this.valuetype = makeType(this.decl.args[0], this.env);
    this.indextype = makeType(this.decl.indexBy, this.env);
  }
  makeDefaultValue() {
    return new ArrayValue(this);
  }
  toString() {
    return `Array<${this.valueType}>[${this.indexType}]`;
  }
}

module.exports = ArrayType;
