"use strict";

let parser = require('./parser.js');
let Environment = require('./environment.js');

let out = function(o) {
  console.log(JSON.stringify(o, null, 2));
};

class Value {
  constructor(type) {
    this.type = type;
  }
}

class RangeValue {

  constructor(type) {
    // super(type); // syntax error?
    this.type = type;

    this.value = this.type.decl.low.value;
  }

  assign(newValue) {
    if (newValue < this.type.decl.low.value ||
      newValue > this.type.decl.high.value) {
      throw Error(`Cannot assign value of ${newValue} to range ${this.type.getName()}: ${this.type.decl.low.value}..${this.type.decl.high.value};`);
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

class RecordValue {

  constructor(type) {
    // super(type); // syntax error?
    this.type = type;

    this.type.decl.fields.forEach((field) => {
      // XXX- should share field Type objects for all instances
      let fieldtype = new Type(field.type, this.type.env);
      this[field.id.value] = fieldtype.makeDefaultValue();
    });
  }

  innerToString() {
    let fields = this.type.decl.fields.map((v) => {
      let rhs = this[v.id.value].toString();
      return `${v.id.value}: ${rhs}`;
    }).join(', ');
    return fields;
  }

  toString() {
    let name = this.type.getName();
    let fields = this.type.decl.fields.map((v) => {
      let rhs = this[v.id.value].toString();
      return `${v.id.value}: ${rhs}`;
    }).join(', ');
    return `${name} { ${fields} }`;
  }
}

class EitherValue {

  constructor(type) {
    // super(type); // syntax error?
    this.type = type;

    let first = this.type.decl.fields[0];
    this.value = first.id.value;
    // XXX- should share field Type objects for all instances
    let fieldtype = new Type(first.type, this.type.env);
    this[first.id.value] = fieldtype.makeDefaultValue();
  }

  assign(newValue) {
    let assigned = false;
    this.type.decl.fields.forEach((field) => {
      if (field.id.value == newValue) {
        this.value = field.id.value;
        this[field.id.value] = new RecordValue(
          new Type({
            kind: 'record',
            fields: []
          }));
        assigned = true;
      }
    });
    if (assigned) {
      return;
    }
    throw Error(`Cannot assign value of ${newValue} to either-type ${this.type.getName()}`);
  }

  innerToString() {
    return this[this.value].toString();
  }

  toString() {
    let fields = this[this.value].innerToString();
    if (fields == '') {
      return `${this.value}`;
    } else {
      return `${this.value} { ${fields} }`;
    }
  }
}


class Type {
  constructor(decl, env, name) {
    this.decl = decl;
    this.env = env;
    this.name = name; // may be undefined
  }
  makeDefaultValue() {
    if (this.decl.kind == 'range') {
      return new RangeValue(this);
    } else if (this.decl.kind == 'record') {
      return new RecordValue(this);
    } else if (this.decl.kind == 'either') {
      return new EitherValue(this);
    } else {
      let o = JSON.stringify(this.decl, null, 2);
      throw Error(`Unknown type: ${o}`);
    }
  }
  getName() {
    if (this.name === undefined) {
      return undefined;
    } else {
      return this.name.value;
    }
  }
}

let loadPrelude = function() {
  let prelude = new Environment();
  let r = parser.parseFile('prelude.model');
  if (!r.status) {
    throw Error(r);
  }
  r.value.forEach((decl) => {
    if (decl.kind == 'typedecl') {
      prelude.assignType(decl.id.value, new Type(decl.type, prelude, decl.id));
    } else {
      let o = JSON.stringify(fieldtype, null, 2);
      throw Error(`unknown statement: ${o}`);
    }
  });
  return prelude;
}
module.exports = {
  Type: Type,
  loadPrelude: loadPrelude,
};

if (require.main === module) {
  let r = parser.parseFile('input.model');
  if (!r.status) {
    parser.consoleOutput(r);
    return;
  }
  let ast = r.value;
  let person = ast[8];
  out(person);
}
