"use strict";

let errors = require('../errors.js');
let Type = require('./type.js');
let Value = require('./value.js');
let makeType = require('./factory.js');
let RecordType = require('./record.js');

// An instance of an EitherVariant.
// 'eithertype' is the EitherType and doesn't change,
// 'varianttype' is the current EitherVariant.
// 'type' is eithertype unless the Variant is known statically, then it's varianttype.
// If the variant has record fields, those will be in an attribute named
// 'fields'; otherwise, it'll be set to undefined.
class EitherValue extends Value {
  constructor(type, eithertype, varianttype) {
    super(type);
    this.eithertype = eithertype;
    this.varianttype = varianttype;
    if (this.varianttype.recordtype === null) {
      this.fields = undefined;
    } else {
      this.fields = this.varianttype.recordtype.makeDefaultValue();
    }
  }

  // call this from JS as follows:
  // let x = thing.match({
  //    Variant1: (t) => 1,
  //    Variant2: (t) => { return t.two + 2; },
  // });
  match(variants) {
    let fn = variants[this.varianttype.name];
    if (fn === undefined) {
      return undefined;
    }
    if (typeof fn === "function") {
      return fn(this.fields);
    } else { // maybe it's an expression
      return fn;
    }
  }

  assign(newValue) {
    let ok = false;
    if (this.type == this.eithertype) {
      ok = (newValue instanceof EitherValue &&
        this.eithertype == newValue.eithertype);
    } else { // this.type == this.varianttype
      ok = (newValue instanceof EitherValue &&
        this.varianttype == newValue.varianttype);
    }
    if (ok) {
      this.varianttype = newValue.varianttype;
      if (this.varianttype.recordtype === null) {
        this.fields = undefined;
      } else {
        this.fields = this.varianttype.recordtype.makeDefaultValue();
        this.fields.assign(newValue.fields);
      }
    } else {
      throw new errors.Internal(`Cannot assign value of ${newValue} to ` +
        `either-type ${this.type.getName()}`);
    }
  }

  lookup(name) {
    return this.fields.lookup(name);
  }

  set(name, value) {
    return this.fields.set(name, value);
  }

  equals(other) {
    if (this.varianttype != other.varianttype) {
      return false;
    }
    if (this.fields !== undefined) {
      return this.fields.equals(other.fields);
    }
    return true;
  }

  innerToString() {
    if (this.fields !== undefined) {
      return this.fields.toString();
    } else {
      return this.varianttype.name;
    }
  }

  toString() {
    if (this.fields !== undefined) {
      return `${this.varianttype.name} { ${this.fields.innerToString()} }`;
    } else {
      return `${this.varianttype.name}`;
    }
  }

  assignJSON(spec) {
    if (typeof spec === 'string') {
      this.assign(
        this.eithertype.getVariant(spec)
          .makeDefaultValue());
    } else {
      this.assign(
        this.eithertype.getVariant(spec.tag)
          .makeDefaultValue());
      this.fields.assignJSON(spec.fields);
    }
  }

  toJSON() {
    if (this.fields !== undefined) {
      let o = {};
      o.tag = this.varianttype.name;
      o.fields = this.fields.toJSON();
      return o;
    } else {
      return this.varianttype.name;
    }
  }
}

// In:
//   type T: either { A, B }
// this represents an A or a B, and its parenttype is T.
// Sometimes we know statically that we have an A or a B.
class EitherVariant extends Type {
  constructor(decl, env, name, parenttype) {
    super(decl, env, name);
    this.parenttype = parenttype;
    if (this.decl.kind == 'enumvariant') {
      this.recordtype = null;
      let constant = new EitherValue(this, this.parenttype, this);
      constant.isConstant = true;
      this.env.vars.set(this.name, constant, this.decl.id.source);
    } else {
      this.recordtype = makeType.make(decl.type, this.env, this.name);
      this.env.assignType(this.name, this);
    }
  }

  equals(other) {
    return this === other;
  }

  makeDefaultValue() {
    return new EitherValue(this, this.parenttype, this);
  }

  fieldType(name) {
    return this.recordtype.fieldType(name);
  }

  toString() {
    return `${this.name} (EitherVariant)`;
  }
}

// The type T in:
//   type T: either { A, B }
// An EitherType is made up of a set of EitherVariant types (A and B in this
// example).
class EitherType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.variants = this.decl.fields.map(
      (field) => new EitherVariant(field, this.env, field.id.value, this)
    );
  }

  equals(other) {
    return this === other;
  }

  getVariant(tag) {
    let variant = undefined;
    this.variants.forEach((v) => {
      if (v.name == tag) {
        variant = v;
      }
    });
    return variant;
  }

  makeDefaultValue() {
    return new EitherValue(this, this, this.variants[0]);
  }

  toString() {
    let name = this.getName();
    if (name !== undefined) {
      return name;
    }
    return `anonymous either (${this.decl.source})`;
  }
}

module.exports = {
  Variant: EitherVariant,
  Type: EitherType,
};
