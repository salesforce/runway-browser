"use strict";

let varlen = {};
module.exports = varlen;

let makeType = require('./factory.js');
let Type = require('./type.js');
let Value = require('./value.js');
let errors = require('../errors.js');
let NumberValue = require('./number.js');
let RangeValue = require('./range.js');

class VarLenBaseValue extends Value {
  constructor(type) {
    super(type);
    let length = this.type.indextype.high - this.type.indextype.low + 1;
    this.items = Array.from({
      length: length
    },
      () => this.type.valuetype.makeDefaultValue());
    this.used = 0;
  }
  usedItems() {
    return this.items.filter((v, i) => i < this.used);
  }


  index(i) {
    if (i instanceof NumberValue.Value || i instanceof RangeValue.Value) {
      i = i.value;
    }
    if (typeof i !== 'number') {
      throw new errors.Internal(`Trying to index array with ${i}`);
    }
    if (i < this.type.indextype.low || i > this.type.indextype.low + this.used - 1) {
      throw new errors.Bounds(`Cannot access index ${i} of ${this}`);
    }
    let v = this.items[i - this.type.indextype.low];
    if (v == undefined) {
      throw new errors.Internal(`Bounds check failed to catch issue: ${i}`);
    }
    return v;
  }
  forEach(cb) {
    this.usedItems().forEach((v, i) => cb(v, this.type.indextype.low + i));
  }
  contains(v) {
    return this.indexOf(v) !== null;
  }
  indexOf(v) {
    let ret = null;
    this.forEach((x, i) => {
      if (x.equals(v)) {
        ret = this.type.indextype.low + i;
      }
    });
    return ret;
  }
  empty() {
    return this.used == 0;
  }
  full() {
    return this.used == this.type.indextype.high - this.type.indextype.low + 1;
  }
  size() {
    return this.used;
  }
  capacity() {
    return this.items.length;
  }

  equals(other) {
    if (this.used != other.used) {
      return false;
    }
    let allEqual = true;
    this.forEach((v, i) => {
      if (!v.equals(other.index(i))) {
        allEqual = false;
      }
    });
    return allEqual;
  }

  toString() {
    let inner = this.usedItems().map((v, i) => {
      return `${this.type.indextype.low + i}: ${v.toString()}`;
    }).join(', ');
    return `{${inner}}`;
  }
  toJSON() {
    return this.usedItems().map((v, i) =>
      [this.type.indextype.low + i, v.toJSON()]);
  }


  push(v) {
    if (this.full()) {
      throw new errors.Bounds(`Cannot push onto ${this}`);
    }
    this.items[this.used].assign(v);
    this.used += 1;
  }
  pop() {
    if (this.used == 0) {
      throw new errors.Bounds(`Cannot pop from empty ${this}`);
    }
    let removed = this.items[this.used];
    this.items[this.used] = this.type.valuetype.makeDefaultValue();
    this.used -= 1;
    return removed;
  }
  remove(v) {
    let index = this.usedItems().findIndex(item => item.equals(v));
    if (index >= 0) {
      this.items = this.items.slice(0, index)
        .concat(this.items.slice(index + 1))
        .concat([this.type.valuetype.makeDefaultValue()]);
      this.used -= 1;
      return true;
    }
    return false;
  }

  assign(other) {
    this.used = 0;
    other.forEach(v => this.push(v));
  }
  assignJSON(spec) {
    this.used = 0;
    spec.forEach(x => {
      this.items[this.used].assignJSON(x[1]);
      this.used += 1;
    });
  }
}

let insertOrdered = function(v) {
  if (this.full()) {
    throw new errors.Bounds(`Cannot push onto ${this}`);
  }
  let cmpkey = v => JSON.stringify(v.toJSON());
  let value = this.type.valuetype.makeDefaultValue();
  value.assign(v);
  let inskey = cmpkey(value);
  let index = 0;
  
  this.forEach((v, i) => {
    if (inskey >= cmpkey(v)) {
      index += 1;
    }
  });
  this.items = this.items.slice(0, index)
    .concat(value)
    .concat(this.items.slice(index, this.items.length - 1));
  this.used += 1;
};

class SetValue extends VarLenBaseValue {
  push(v) {
    if (!this.contains(v)) {
      insertOrdered.call(this, v);
    }
  }
}
class MultiSetValue extends VarLenBaseValue {
  push(v) {
    insertOrdered.call(this, v);
  }
}

class OrderedSetValue extends VarLenBaseValue {
  push(v) {
    if (!this.contains(v)) {
      super.push(v);
    }
  }
}

class VectorValue extends VarLenBaseValue {
}


class VarLenBaseType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.valuetype = makeType.make(this.decl.args[0], this.env);
    this.indextype = makeType.make(this.decl.indexBy, this.env);
  }
}

class SetType extends VarLenBaseType {
  makeDefaultValue() {
    return new SetValue(this);
  }
  toString() {
    return `Set<${this.valuetype}>[${this.indextype}]`;
  }
}

class MultiSetType extends VarLenBaseType {
  makeDefaultValue() {
    return new MultiSetValue(this);
  }
  toString() {
    return `MultiSet<${this.valuetype}>[${this.indextype}]`;
  }
}

class OrderedSetType extends VarLenBaseType {
  makeDefaultValue() {
    return new OrderedSetValue(this);
  }
  toString() {
    return `OrderedSet<${this.valuetype}>[${this.indextype}]`;
  }
}

class VectorType extends VarLenBaseType {
  makeDefaultValue() {
    return new VectorValue(this);
  }
  toString() {
    return `Vector<${this.valuetype}>[${this.indextype}]`;
  }
}

varlen.SetType = SetType;
varlen.SetValue = SetValue;
varlen.MultiSetType = MultiSetType;
varlen.MultiSetValue = MultiSetValue;
varlen.OrderedSetType = OrderedSetType;
varlen.OrderedSetValue = OrderedSetValue;
varlen.VectorType = VectorType;
varlen.VectorValue = VectorValue;
