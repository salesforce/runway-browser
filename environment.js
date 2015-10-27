"use strict";

let errors = require('./errors.js');
let util = require('util');

class Environment {
  constructor(enclosing) {
    if (enclosing == undefined) {
      this.enclosing = null;
    } else {
      this.enclosing = enclosing;
    }
    this.types = new Map();
    this.vars = new Map();
  }

  assignType(id, decl) {
    let v = this.getType(id);
    if (v != undefined) {
      throw new errors.Type(`Cannot shadow type ${v} with ${decl}`);
    }
    this.types.set(id, decl);
  }

  getType(id) {
    let v = this.types.get(id);
    if (v != undefined) {
      return v;
    }
    if (this.enclosing != null) {
      return this.enclosing.getType(id);
    }
    return undefined;
  }

  getTypeNames() {
    let here = Array.from(this.types.keys());
    if (this.enclosing != null) {
      return this.enclosing.getTypeNames().concat(here);
    } else {
      return here;
    }
  }

  assignVar(id, decl) {
    let v = this.getVar(id);
    if (v != undefined) {
      throw new errors.Type(`Cannot shadow variable ${v} with ${decl}`);
    }
    this.vars.set(id, decl);
  }

  getVar(id) {
    let v = this.vars.get(id);
    if (v != undefined) {
      return v;
    }
    if (this.enclosing != null) {
      return this.enclosing.getVar(id);
    }
    return undefined;
  }

  getVarNames() {
    let here = Array.from(this.vars.keys());
    if (this.enclosing != null) {
      return this.enclosing.getVarNames().concat(here);
    } else {
      return here;
    }
  }

  toString() {
    return util.inspect(this);
  }

}

module.exports = Environment;
