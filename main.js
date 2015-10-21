"use strict";

let Input = require('./input.js');
let parser = require('./parser.js');
let Environment = require('./environment.js');
let Type = require('./type.js');
let makeStatement = require('./statements/factory.js');
let makeType = require('./typefactory.js');
let process = require('process');

let out = function(o) {
  console.log(JSON.stringify(o, null, 2));
};

let load = function(parsed, env) {
  let ast = makeStatement(parsed, env);
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
    let printEnv = () => {
      env.getVarNames().forEach((v) => {
        console.log(v, '=', env.getVar(v).toString());
      });
      console.log();
    };
    printEnv();
    for (let rule in env.rules) {
      console.log('Executing ', rule);
      env.rules[rule].execute();
      printEnv();
    }
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
            env.rules['interactive'].execute();
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
