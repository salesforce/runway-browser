"use strict";

let Type = require('./type.js');
let Value = require('./value.js');

class RecordValue extends Value {

  constructor(type) {
    super(type);
    this.type.fieldtypes.forEach((fieldtype) => {
      this[fieldtype.name] = fieldtype.type.makeDefaultValue();
    });
  }

  lookup(fieldname) {
    return this[fieldname];
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


class RecordType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    let makeType = require('./factory.js');
    this.fieldtypes = this.decl.fields.map((field) => ({
        name: field.id.value,
        type: makeType(field.type, this.env),
    }));
  }
  fieldType(name) {
    let retval = undefined;
    this.fieldtypes.forEach((ft) => {
      if (ft.name == name) {
        retval = ft.type;
      }
    });
    return retval;
  }
  makeDefaultValue() {
    return new RecordValue(this);
  }
  toString() {
    let name = this.getName();
    if (name !== undefined) {
      return name;
    }
    return 'anonymous record';
  }
}

module.exports = RecordType;
