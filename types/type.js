"use strict";

let errors = require('../errors.js');

class Type {
  constructor(decl, env, name) {
    this.decl = decl;
    this.env = env;
    this.name = name; // may be undefined
  }
  equals(other) {
    throw new errors.Type(`equals() not implemented for ${this} type`);
  }
  getName() {
    if (this.name === undefined) {
      return undefined;
    } else if (typeof this.name == 'string') {
      return this.name;
    } else {
      return this.name.value;
    }
  }
}

module.exports = Type;
