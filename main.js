"use strict";

let Input = require('./input.js');
let parser = require('./parser.js');
let Environment = require('./environment.js');
let Type = require('./type.js');
let makeType = require('./typefactory.js');
let process = require('process');

let out = function(o) {
  console.log(JSON.stringify(o, null, 2));
};

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
        return ast.value;
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
  parsed.forEach((decl) => {
    if (decl.kind == 'typedecl') {
      env.assignType(decl.id.value, makeType(decl.type, env, decl.id));
    } else if (decl.kind == 'paramdecl') {
      let type = makeType(decl.type, env);
      let value = type.makeDefaultValue();
      value.assign(decl.default.value);
      env.assignVar(decl.id.value, value);
    } else if (decl.kind == 'vardecl') {
      let type = makeType(decl.type, env);
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
  load(parser.parse(new Input('prelude.model')), env);
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
    let filename = process.argv[2];
    load(parser.parse(new Input(filename)), env);
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
            load(parser.parse(new Input('REPL',
              `rule interactive { ${input.slice(2)} }`)), env);
            env.rules['interactive'].evaluate();
          } catch ( e ) {
            readline.write(`${e}\n`);
          }
        } else {
          try {
            load(parser.parse(new Input('REPL', input)), env);
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
