"use strict";

let errors = require('../errors.js');
let Type = require('./type.js');
let Value = require('./value.js');

// An instance of an EitherVariant.
// 'type' is the EitherType and doesn't change,
// 'varianttype' is the current EitherVariant.
// If the variant has record fields, those will be in an attribute named
// 'fields'; otherwise, it'll be set to undefined.
class EitherValue extends Value {
  constructor(type, varianttype) {
    super(type);
    this.varianttype = varianttype;
    if (this.varianttype.recordtype === null) {
      this.fields = undefined;
    } else {
      this.fields = this.varianttype.recordtype.makeDefaultValue();
    }
  }

  assign(newValue) {
    if (newValue instanceof EitherValue && this.type == newValue.type) {
      this.varianttype = newValue.varianttype;
      this.fields = newValue.fields;
    } else {
      throw new errors.Internal(`Cannot assign value of ${newValue} to ` +
        `either-type ${this.type.getName()}`);
    }
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
      this.env.assignVar(this.name, new EitherValue(this.parenttype, this));
    } else {
      let makeType = require('./factory.js');
      this.recordtype = makeType(decl.type, this.env);
    }
  }

  makeDefaultValue() {
    return new EitherValue(this.parenttype, this);
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
    return new EitherValue(this, this.variants[0]);
  }

  toString() {
    let name = this.getName();
    if (name !== undefined) {
      return name;
    }
    return 'anonymous either';
  }
}

module.exports = {
  Variant: EitherVariant,
  Type: EitherType,
};
