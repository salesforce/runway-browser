"use strict";

let errors = require('../errors.js');

class Value {
  constructor(type) {
    this.type = type;
  }

  assign(other) {
    throw new errors.Type(`assign() not implemented for ${this.type} values`);
  }

  equals(other) {
    throw new errors.Type(`equals() not implemented for ${this.type} values`);
  }
}

module.exports = Value;
