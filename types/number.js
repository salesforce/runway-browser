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
    } else if (newValue instanceof RangeValue) {
      this.value = newValue.value;
    } else {
      throw new errors.Internal(`Trying to assign ${newValue.type} to Number;`);
    }
  }

  innerToString() {
    return `${this.value}`;
  }

  toString() {
    return `${this.value}`;
  }
}

class NumberType extends Type {
  constructor() {
    super(null, null, 'Number');
  }
  makeDefaultValue() {
    return new NumberValue(this);
  }
  toString() {
    return 'Number';
  }
}

NumberType.singleton = new NumberType();

module.exports = NumberType;
