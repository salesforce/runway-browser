"use strict";

let GlobalEnvironment = require('./environment.js').GlobalEnvironment;
let Input = require('./input.js');
let compiler = require('./compiler.js');
let errors = require('./errors.js');
let docopt = require('docopt').docopt;
let fs = require('fs');
let parser = require('./parser.js');
let process = require('process');
let checker = require('./modelchecker.js').checker;
let Controller = require('./controller.js');
let Simulator = {
  step: require('./simulator.js'),
};

let out = function(o) {
  console.log(JSON.stringify(o, null, 2));
};

let printEnv = (env) => {
  env.vars.forEachLocal((value, name) => {
    if (value.isConstant !== true) {
      console.log(`${name} = ${value}`);
    }
  });
  console.log();
};

let repl = function(env) {
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

  var forgivingLoad = function(input, env) {
    let load = (input) => compiler.load(new Input('REPL', input), env);
    let rescueAttempts = [
      (input) => load(input + ';'),
      (input) => load('print ' + input),
      (input) => load('print ' + input + ';'),
    ];
    try {
      return load(input);
    } catch ( originalError ) {
      let module = null;
      rescueAttempts.forEach((attempt) => {
        if (module === null) {
          try {
            module = attempt(input);
          } catch ( uselessError ) {
            // do nothing
          }
        }
      });
      if (module === null) {
        throw originalError;
      } else {
        return module;
      }
    }
  };

  let context = {};
  var loop = function() {
    let processInput = function(input) {
      if (input.endsWith('\\')) {
        readline.question('... ', (more) => processInput(input.slice(0, -1) + more));
        return;
      } else if (input == '.types') {
        console.log(`${env.getTypeNames().join(' ')}`);
      } else if (input == '.vars') {
        console.log(`${env.getVarNames().join(' ')}`);
      } else if (input.startsWith('.js')) {
        try {
          eval(input.slice(3));
        } catch ( e ) {
          printError(e);
        }
      } else if (input == 'exit') {
        readline.close();
        return;
      } else if (input.startsWith('.fire')) {
        let args = input.split(' ');
        try {
          if (args.length == 2) {
            env.getRule(args[1]).fire(context);
            printEnv(env);
          } else if (args.length == 3) {
            env.getRule(args[1]).fire(Number(args[2]), context);
            printEnv(env);
          } else {
            console.log('huh?');
          }
        } catch ( e ) {
          printError(e);
        }
      } else if (input[0] == '.') {
        console.log('huh?');
      } else {
        try {
          let module = forgivingLoad(input, env);
          module.ast.execute(context);
        } catch ( e ) {
          printError(e);
        }
      }
      loop();
    };
    readline.question('> ', processInput);
  };
  loop();
};

let readFile = (filename) => fs.readFileSync(filename).toString();

module.exports = {
  repl: repl,
};

if (require.main === module) {
  let doc = `
Usage: main.js [options] [<model>]
       main.js check [options] <model>
       main.js simulate [options] <model>

  -h --help  Show this usage message.`;
  let usageError = () => {
    console.log(doc);
    process.exit(1);
  };

  let options = docopt(doc);
  //console.log('Options:', options);
  if (options['<model>'] == 'check' ||
      options['<model>'] == 'simulate') {
    usageError();
  }

  let prelude = compiler.loadPrelude(readFile('prelude.model'));
  let env = new GlobalEnvironment(prelude.env);

  let module;
  if (options['<model>']) {
    let filename = options['<model>'];
    module = compiler.load(new Input(filename, readFile(filename)), env);
    let context = {};
    module.ast.execute(context);
  }

  if (options.simulate) {
    let controller = new Controller(module);
    let i = 0;
    do {
      process.stdout.write(`${i}: `);
      i += 1;
    } while (Simulator.step(module, controller));
    printEnv(env);
  } else if (options.check) {
    checker(module);
  } else { // repl
    printEnv(env);
    repl(env);
  }
}
