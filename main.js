"use strict";

let parser = require('./parser.js');
let Environment = require('./environment.js');
let process = require('process');

let out = function(o) {
  console.log(JSON.stringify(o, null, 2));
};

class Value {
  constructor(type) {
    this.type = type;
  }
}

class RangeValue extends Value {

  constructor(type) {
    super(type);
    this.value = this.type.low;
  }

  assign(newValue) {
    if (newValue < this.type.low || newValue > this.type.high) {
      throw Error(`Cannot assign value of ${newValue} to range ${this.type.getName()}: ${this.type.low}..${this.type.high};`);
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

class RecordValue extends Value {

  constructor(type) {
    super(type);
    this.type.fieldtypes.forEach((fieldtype) => {
      this[fieldtype.name] = fieldtype.type.makeDefaultValue();
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

class EitherValue extends Value {

  constructor(type) {
    super(type);
    let first = this.type.fieldtypes[0];
    this.value = first.name;
    this[this.value] = first.type.makeDefaultValue();
  }

  assign(newValue) {
    let assigned = false;
    this.type.fieldtypes.forEach((fieldtype) => {
      if (fieldtype.name == newValue) {
        this.value = fieldtype.name;
        this[this.value] = fieldtype.type.makeDefaultValue();
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

class ArrayValue extends Value {
  constructor(type) {
    super(type);
    let length = type.indextype.high - type.indextype.low + 1;
    this.items = Array.from({
      length: length
    },
      () => this.type.valuetype.makeDefaultValue());
  }
  toString() {
    let inner = this.items.map((v, i) => {
      return `${this.type.indextype.low + i}: ${v.toString()}`;
    }).join(', ');
    return `[${inner}]`;
  }
}

class Type {
  constructor(decl, env, name) {
    this.decl = decl;
    this.env = env;
    this.name = name; // may be undefined
  }
  getName() {
    if (this.name === undefined) {
      return undefined;
    } else {
      return this.name.value;
    }
  }
  static make(decl, env, name) {
    if (decl.kind == 'range') {
      return new RangeType(decl, env, name);
    } else if (decl.kind == 'record') {
      return new RecordType(decl, env, name);
    } else if (decl.kind == 'either') {
      return new EitherType(decl, env, name);
    } else if (decl.kind == 'alias') {
      let t = env.getType(decl.value);
      if (t === undefined) {
        throw Error(`Unknown type ${decl.value}`);
      }
      return t;
    } else if (decl.kind == 'generic') {
      if (decl.base.value == 'Array') {
        return new ArrayType(decl, env, name);
      } else {
        throw Error(`Unknown type '${decl.base.value}'`);
      }
    }
    let o = JSON.stringify(decl, null, 2);
    throw Error(`Unknown type '${name}': ${o}`);
  }
}

class RangeType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.low = this.decl.low.value;
    this.high = this.decl.high.value;
  }
  makeDefaultValue() {
    return new RangeValue(this);
  }
}

class RecordType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.fieldtypes = this.decl.fields.map((field) => ({
        name: field.id.value,
        type: Type.make(field.type, this.env),
    }));
  }
  makeDefaultValue() {
    return new RecordValue(this);
  }
}

class EitherType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.fieldtypes = this.decl.fields.map((field) => ({
        name: field.id.value,
        type: Type.make(field.type, this.env),
    }));
  }
  makeDefaultValue() {
    return new EitherValue(this);
  }
}

class ArrayType extends Type {
  constructor(decl, env, name) {
    super(decl, env, name);
    this.valuetype = Type.make(this.decl.args[0], this.env);
    this.indextype = Type.make(this.decl.indexBy, this.env);
  }
  makeDefaultValue() {
    return new ArrayValue(this);
  }
}

let load = function(parsed, env) {
  if (!parsed.status) {
    let o = JSON.stringify(parsed, null, 2);
    throw Error(`Parse error: ${o}`);
  }
  parsed.value.forEach((decl) => {
    if (decl.kind == 'typedecl') {
      env.assignType(decl.id.value, Type.make(decl.type, env, decl.id));
    } else if (decl.kind == 'paramdecl') {
      let type = Type.make(decl.type, env);
      let value = type.makeDefaultValue();
      value.assign(decl.default.value);
      env.assignVar(decl.id.value, value);
    } else if (decl.kind == 'vardecl') {
      let type = Type.make(decl.type, env);
      let value = type.makeDefaultValue();
      if (decl.default !== undefined) {
        value.assign(decl.default.value);
      }
      env.assignVar(decl.id.value, value);
    } else {
      let o = JSON.stringify(decl, null, 2);
      throw Error(`unknown statement: ${o}`);
    }
  });
  return env;
};

let loadPrelude = function() {
  let env = new Environment();
  load(parser.parseFile('prelude.model'), env);
  return env;
};

module.exports = {
  Type: Type,
  load: load,
  loadPrelude: loadPrelude,
};

if (require.main === module) {
  let prelude = loadPrelude();
  let env = new Environment(prelude);
  let filename = 'input.model';
  if (process.argv.length > 2) {
    filename = process.argv[2];
  }
  load(parser.parseFile(filename), env);
  console.log(env.toString());
}
