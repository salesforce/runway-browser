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
  assign(newValue) {
    let kind = this.type.decl.kind;
    if (kind == 'range') {
      if (newValue < this.type.decl.low.value ||
        newValue > this.type.decl.high.value) {
        throw Error(`Cannot assign value of ${newValue} to range ${this.type.getName()}: ${this.type.decl.low.value}..${this.type.decl.high.value};`);
      }
      this.value = newValue;
      return;
    } else if (kind == 'either') {
      let assigned = false;
      this.type.decl.fields.forEach((field) => {
        if (field.id.value == newValue) {
          this.value = field.id.value;
          this[field.id.value] = new Value(
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
    throw Error(`Not implemented: assign to ${kind}`);
  }

  innerToString() {
    let name = this.type.getName();
    let kind = this.type.decl.kind;
    if (kind == 'range') {
      return `${this.value}`;
    } else if (kind == 'record') {
      let fields = this.type.decl.fields.map((v) => {
        let rhs = this[v.id.value].toString();
        return `${v.id.value}: ${rhs}`;
      }).join(', ');
      return fields;
    } else if (kind == 'either') {
      return this[this.value].toString();
    }
    throw Error(`Not implemented: innerToString for ${kind}`);
  }


  toString() {
    let name = this.type.getName();
    let kind = this.type.decl.kind;
    if (kind == 'range') {
      if (name === undefined) {
        return `${this.value}`;
      } else {
        return `${name}(${this.value})`;
      }
    } else if (kind == 'record') {
      let fields = this.type.decl.fields.map((v) => {
        let rhs = this[v.id.value].toString();
        return `${v.id.value}: ${rhs}`;
      }).join(', ');
      return `${name} { ${fields} }`;
    } else if (kind == 'either') {
      let fields = this[this.value].innerToString();
      if (fields == '') {
        return `${this.value}`;
      } else {
        return `${this.value} { ${fields} }`;
      }
    }
    return name;
  }
}

class Type {
  constructor(decl, env, name) {
    this.decl = decl;
    this.env = env;
    this.name = name; // may be undefined
  }
  makeDefaultValue() {
    let value = new Value(this);

    if (this.decl.kind == 'range') {
      value.value = this.decl.low.value;
    } else if (this.decl.kind == 'record') {
      this.decl.fields.forEach((field) => {
        let type = new Type(field.type, this.env);
        value[field.id.value] = type.makeDefaultValue();
      });
    } else if (this.decl.kind == 'either') {
      let first = this.decl.fields[0];
      value.value = first.id.value;
      let type = new Type(first.type, this.env);
      value[first.id.value] = type.makeDefaultValue();
    } else {
      let o = JSON.stringify(this.decl, null, 2);
      throw Error(`Unknown field type: ${o}`);
    }

    return value;
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
