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

class EitherVariant extends Type {
  constructor(decl, env, name, eithertype) {
    super(decl, env, name);
    this.eithertype = eithertype;
    this.tag = new EitherTag(this, name);
    if (decl.kind == 'enumvariant') {
      this.env.assignVar(name, this.tag);
    } else {
      this.recordtype = Type.make(decl.type, this.env);
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

class Code {
  constructor(decl, env, name) {
    this.decl = decl;
    this.env = env;
    this.name = name;
  }

  static format(ast) {
    let format = Code.format;
    if (ast.kind == 'sequence') {
      return ast.statements.map((v) => format(v)).join("\n");
    } else if (ast.kind == 'ifelse') {
      return `if ${format(ast.condition)} {
  ${format(ast.thenblock)}
} else {
  ${format(ast.elseblock)}
}`;
    } else if (ast.kind == 'matches') {
      return `${format(ast.expr)} matches ${format(ast.variant)}`;
    } else if (ast.kind == 'assign') {
      return `${format(ast.id)} = ${format(ast.expr)};`;
    } else if (ast.kind == 'recordvalue') {
      let inner = ast.fields.map((f) => `${f.id.value}: ${format(f.expr)}`).join(', ');
      return `${ast.type.value} { ${inner} }`;
    } else if (ast.kind == 'lookup') {
      return `${format(ast.parent)}.${format(ast.child)}`;
    } else if (ast.kind == 'index') {
      return `${format(ast.parent)}[${format(ast.by)}]`;
    } else if (ast.kind == 'id') {
      return `${ast.value}`;
    } else if (ast.kind == 'alias') {
      return `${ast.value}`;
    } else if (ast.kind == 'number') {
      return `${ast.value}`;
    } else if (ast.kind == 'apply') {
      let args = ast.args.map(format).join(', ');
      return `${ast.func}(${args})`;
    } else if (ast.kind == 'print') {
      return `print ${format(ast.expr)}`;
    } else if (ast.kind == 'vardecl') {
      let def = '';
      if (ast.default !== undefined) {
        def = ` = ${format(ast.default)}`;
      }
      return `var ${ast.id.value} : ${format(ast.type)}${def};`;
    } else {
      out(ast);
      return `${ast.kind}`;
    }
  }

  evaluate() {
    let evaluate = (ast) => {
      if (ast.kind == 'print') {
        console.log(evaluate(ast.expr).toString());
      } else if (ast.kind == 'sequence') {
        ast.statements.forEach(evaluate);
      } else if (ast.kind == 'id') {
        let r = this.env.getVar(ast.value);
        if (r === undefined) {
          throw Error(`'${ast.value}' is not a variable/constant in scope`);
        }
        return r;
      } else if (ast.kind == 'number') {
        return this.value;
      } else if (ast.kind == 'assign') {
        this.env.getVar(ast.id.value).assign(evaluate(ast.expr));
      } else {
        let o = JSON.stringify(ast, null, 2);
        throw Error(`Evaluation not implemented for: ${o}`);
      }
    };
    evaluate(this.decl);
  }

  toString() {
    return Code.format(this.decl);
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
    } else if (decl.kind == 'rule') {
      let rule = new Code(decl.code, env, decl.id.value);
      //console.log(rule.toString());
      if (env.rules === undefined) {
        env.rules = {};
      }
      env.rules[decl.id.value] = rule;
    } else if (decl.kind == 'rulefor') {
      let rule = new Code(decl.code, env, decl.id.value);
      console.log(rule.toString());
      if (env.rules === undefined) {
        env.rules = {};
      }
      env.rules[decl.id.value] = rule;
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
  if (process.argv.length > 2) {
    filename = process.argv[2];
    load(parser.parseFile(filename), env);
    console.log(env.toString());
  } else { // run repl

    var readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    var loop = function() {
      readline.question('> ', function(input) {
        if (input == '.types') {
          readline.write(`${env.getTypeNames().join(' ')}\n`);
        } else if (input == '.vars') {
          readline.write(`${env.getVarNames().join(' ')}\n`);
        } else if (input == 'exit') {
          readline.close();
          return;
        } else if (input.length == 0) {
          // do nothing
        } else if (input[0] == '.') {
          readline.write('huh?\n');
        } else if (input.slice(0, 2) == 'do') {
          try {
            load(parser.parse(`rule interactive { ${input.slice(2)} }`), env);
            env.rules['interactive'].evaluate();
          } catch ( e ) {
            readline.write(`${e}\n`);
          }
        } else {
          try {
            load(parser.parse(input), env);
          } catch ( e ) {
            readline.write(`${e}\n`);
          }
        }
        loop();
      });
    };
    loop();
  }
}
