"use strict";

let Input = require('./input.js');
let parser = require('./parser.js');
let Environment = require('./environment.js');
let Type = require('./types/type.js');
let makeStatement = require('./statements/factory.js');
let makeType = require('./types/factory.js');
let process = require('process');
let errors = require('./errors.js');

let out = function(o) {
  console.log(JSON.stringify(o, null, 2));
};

let load = function(parsed, env) {
  let ast = makeStatement(parsed, env);
  return {
    ast: ast,
    env: env,
  };
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

    let printError = function(error) {
      if (error instanceof errors.Base) { // modeling error
        console.log(`${error}`);
      } else { // JS error
        if (error.stack !== undefined) {
          console.log(`${error.stack}`);
        } else {
          console.log(`${error}`);
        }
      }
    };

    var loop = function() {
      let processInput = function(input) {
        if (input.endsWith('\\')) {
          readline.question('... ', (more) => processInput(input.slice(0, -1) + more));
          return;
        } else if (input == '.types') {
          console.log(`${env.getTypeNames().join(' ')}`);
        } else if (input == '.vars') {
          console.log(`${env.getVarNames().join(' ')}`);
        } else if (input == 'exit') {
          readline.close();
          return;
        } else if (input.length == 0) {
          // do nothing
        } else if (input[0] == '.') {
          console.log('huh?');
        } else {
          let parse = (input) => load(parser.parse(new Input('REPL', input)), env);
          let module = null;
          try {
            module = parse(input);
          } catch (originalLoadError) {
            // Give the input another chance if it's just missing a semicolon
            // at the end (it's a common error to forget these when typing
            // interactively).
            if (originalLoadError.expected === undefined ||
                originalLoadError.expected.indexOf("';'") === -1) {
              printError(originalLoadError);
            } else {
              try {
                module = parse(input + ';');
              } catch (rescueLoadError) {
                printError(originalLoadError); // perfer original error
              }
            }
          }
          if (module !== null) { // execute code
            try {
              module.ast.typecheck();
              module.ast.execute();
            } catch (executeError) {
              printError(executeError);
            }
          }
        }
        loop();
      };
      readline.question('> ', processInput);
    };
    loop();
  }
}
