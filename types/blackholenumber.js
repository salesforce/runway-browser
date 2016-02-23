"use strict";

let errors = require('../errors.js');
let Type = require('./type.js');
let Value = require('./value.js');

class BlackHoleNumberValue extends Value {
  constructor(type) {
    super(type);
    this.value = 0;
  }

  assign(newValue) {
    if (typeof newValue !== 'number' &&
        (newValue.value === undefined ||
         typeof newValue.value !== 'number')) {
      throw new errors.Internal(`Trying to assign ${newValue.type} to Number;`);
    }
  }

  equals(other) {
    return this.type == other.type;
  }

  innerToString() {
    return 0;
  }

  assignJSON(spec) {
  }

  toJSON() {
    return 0;
  }

  toString() {
    return 0;
  }
}

class BlackHoleNumberType extends Type {
  constructor() {
    super(null, null, 'BlackHoleNumber');
  }
  equals(other) {
    return other === BlackHoleNumberType.singleton;
  }
  makeDefaultValue() {
    return new BlackHoleNumberValue(this);
  }
  toString() {
    return 'BlackHoleNumber';
  }
}

BlackHoleNumberType.singleton = new BlackHoleNumberType();

module.exports = {
  Type: BlackHoleNumberType,
  Value: BlackHoleNumberValue,
};
