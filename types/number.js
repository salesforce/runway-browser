"use strict";

let errors = require('../errors.js');
let Type = require('./type.js');
let Value = require('./value.js');

class NumberValue extends Value {
  constructor(type) {
    super(type);
    this.value = 0;
  }

  assign(newValue) {
    if (typeof newValue == 'number') {
      this.value = newValue;
    } else if (newValue.value !== undefined && typeof newValue.value == 'number') {
      this.value = newValue.value;
    } else {
      throw new errors.Internal(`Trying to assign ${newValue.type} to Number;`);
    }
  }

  equals(other) {
    return this.type == other.type && this.value == other.value;
  }

  innerToString() {
    return `${this.value}`;
  }

  assignJSON(spec) {
    this.value = spec;
  }

  toJSON() {
    return this.value;
  }

  toString() {
    return `${this.value}`;
  }
}

class NumberType extends Type {
  constructor() {
    super(null, null, 'Number');
  }
  equals(other) {
    return other === NumberType.singleton;
  }
  makeDefaultValue() {
    return new NumberValue(this);
  }
  toString() {
    return 'Number';
  }
}

NumberType.singleton = new NumberType();

module.exports = {
  Type: NumberType,
  Value: NumberValue,
};
