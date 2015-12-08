"use strict";

let set = {};
module.exports = set;

let makeType = require('./factory.js');
let OrderedSet = require('./orderedset.js');
let Type = require('./type.js');
let Value = require('./value.js');

class SetValue extends Value {
  constructor(type) {
    super(type);
    this.ordered = new OrderedSet.Value(type);
  }

  usedItems() {
    return this.ordered.usedItems();
  }

  index(i) {
    return this.ordered.index(i);
  }

  forEach(cb) {
    return this.ordered.forEach(cb);
  }

  push(v) {
    return this.ordered.push(v);
  }

  pop() {
    return this.ordered.pop();
  }

  remove(v) {
    return this.ordered.remove(v);
  }

  contains(v) {
    return this.ordered.contains(v);
  }

  empty() {
    return this.ordered.empty();
  }

  full() {
    return this.ordered.full();
  }

  toString() {
    let inner = this.ordered.usedItems().map((v) => `${v}`).sort().join(', ');
    return `{${inner}}`;
  }

  toJSON() {
    return this.ordered.usedItems().map((v) => v.toJSON()).sort();
  }
}

class SetType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.valuetype = makeType.make(this.decl.args[0], this.env);
    this.indextype = makeType.make(this.decl.indexBy, this.env);
  }

  makeDefaultValue() {
    return new SetValue(this);
  }

  toString() {
    return `Set<${this.valueType}>[${this.indexType}]`;
  }
}

set.Type = SetType;
set.Value = SetValue;
