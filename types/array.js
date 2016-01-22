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

  toJSON() {
    return this.items.map((v, i) => [this.type.indextype.low + i, v.toJSON()]);
  }
  assign(other) {
    this.forEach((v, i) => this.index(i).assign(other.index(i)));   
  }
  equals(other) {
    let allEqual = true;
    this.forEach((v, i) => {
      if (!v.equals(other.index(i))) {
        allEqual = false;
      }
    });
    return allEqual;
  }
  size() {
    return this.items.length;
  }
  capcacity() {
    return this.items.length;
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
    return `Array<${this.valuetype}>[${this.indextype}]`;
  }
}

array.Type = ArrayType;
array.Value = ArrayValue;
