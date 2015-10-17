"use strict";

let Type = require('./type.js');
let Value = require('./value.js');

class RangeValue extends Value {

  constructor(type) {
    super(type);
    this.value = this.type.low;
  }

  assign(newValue) {
    if (newValue < this.type.low || newValue > this.type.high) {
      throw Error(`Cannot assign value of ${newValue} to range ${this.type.getName()}: ${this.type.low}..${this.type.high};`);
    }
    this.value = newValue;
  }

  innerToString() {
    return `${this.value}`;
  }

  toString() {
    let name = this.type.getName();
    if (name === undefined) {
      return `${this.value}`;
    } else {
      return `${name}(${this.value})`;
    }
  }
}

class RangeType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.low = this.decl.low.value;
    this.high = this.decl.high.value;
  }
  makeDefaultValue() {
    return new RangeValue(this);
  }
}

module.exports = RangeType;
