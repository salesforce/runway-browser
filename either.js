"use strict";

let Type = require('./type.js');
let Value = require('./value.js');

class EitherValue extends Value {
  constructor(type) {
    super(type);
    let first = this.type.fieldtypes[0];
    this.tag = first.tag;
    if (first.recordtype !== undefined) {
      this[this.tag.name] = first.recordtype.makeDefaultValue();
    } else { // enumvariant
      // do nothing
    }
  }

  assign(newValue) {
    let fieldtype = null;
    this.type.fieldtypes.forEach((ft) => {
      if (ft.tag === newValue || ft.tag.name === newValue) {
        fieldtype = ft;
      }
    });
    if (fieldtype !== null) {
      let _ = delete this[this.tag.name];
      this.tag = fieldtype.tag;
      if (fieldtype.recordtype !== undefined) {
        this[this.tag.name] = fieldtype.recordtype.makeDefaultValue();
      }
      return;
    }
    throw Error(`Cannot assign value of ${newValue} to either-type ${this.type.getName()}`);
  }

  innerToString() {
    if (this.tag.name in this) {
      return this[this.tag.name].toString();
    } else {
      return this.tag.toString();
    }
  }

  toString() {
    if (this.tag.name in this) {
      let fields = this[this.tag.name].innerToString();
      return `${this.tag.toString()} { ${fields} }`;
    } else {
      return this.tag.toString();
    }
  }
}

class EitherTag extends Value {
  constructor(type, name) {
    super(type);
    this.name = name;
  }
  innerToString() {
    return `${this.name}`;
  }
  toString() {
    return `${this.name}`;
  }
}

class EitherVariant extends Type {
  constructor(decl, env, name, eithertype) {
    super(decl, env, name);
    this.eithertype = eithertype;
    this.tag = new EitherTag(this, name);
    if (decl.kind == 'enumvariant') {
      this.env.assignVar(name, this.tag);
    } else {
      let makeType = require('./typefactory.js');
      this.recordtype = makeType(decl.type, this.env);
    }
  }
}

class EitherType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.fieldtypes = this.decl.fields.map(
      (field) => new EitherVariant(field, this.env, field.id.value, this)
    );
  }
  makeDefaultValue() {
    return new EitherValue(this);
  }
}

module.exports = EitherType;
