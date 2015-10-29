"use strict";

let array = {};
module.exports = array;

let makeType = require('./factory.js');
let Type = require('./type.js');
let Value = require('./value.js');
let errors = require('../errors.js');
let NumberValue = require('./number.js');
let RangeValue = require('./range.js');

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
    if (i instanceof NumberValue.Value || i instanceof RangeValue.Value) {
      i = i.value;
    }
    if (typeof i !== 'number') {
      throw new errors.Internal(`Trying to index array with ${i}`);
    }
    if (i < this.type.indextype.low || i > this.type.indextype.high) {
      throw new errors.Bounds(`Cannot access index ${i} of ${this}`);
    }
    let v = this.items[i - this.type.indextype.low];
    if (v == undefined) {
      throw new errors.Internal(`Bounds check failed to catch issue: ${i}`);
    }
    return v;
  }
  forEach(cb) {
    this.items.forEach((v, i) => cb(v, this.type.indextype.low + i));
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
    this.valuetype = makeType.make(this.decl.args[0], this.env);
    this.indextype = makeType.make(this.decl.indexBy, this.env);
  }
  makeDefaultValue() {
    return new ArrayValue(this);
  }
  toString() {
    return `Array<${this.valueType}>[${this.indexType}]`;
  }
}

array.Type = ArrayType;
array.Value = ArrayValue;
