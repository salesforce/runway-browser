"use strict";

let assert = require('assert');
let Environment = require('./environment.js');
let Input = require('./input.js');
let Parser = require('./parser.js');
let main = require('./main.js');
let Type = require('./types/type.js');
let makeType = require('./types/factory.js');

let parseInline = (text) => Parser.parse(new Input('unit test', text));

describe('main.js', function() {

  describe('range', function() {
    it('range', function() {
      let parsed = parseInline('type DoubleDigits: 10..99;');
      let typedecl = parsed.statements[0];
      assert.equal(typedecl.kind, 'typedecl');
      let env = new Environment();
      let type = makeType(typedecl.type, env, typedecl.id);
      let value = type.makeDefaultValue();
      assert.equal(value.toString(), '10');
      value.assign(11);
      assert.equal(value.toString(), '11');
      assert.throws(() => {
        value.assign(9);
      });
    });
  });

  describe('record', function() {
    it('record', function() {
      let parsed = parseInline(`
        type Pair: record {
          first: 10..15,
          second: 12..17,
        };`);
      let typedecl = parsed.statements[0];
      assert.equal(typedecl.kind, 'typedecl');
      let env = new Environment();
      let type = makeType(typedecl.type, env, typedecl.id);
      let value = type.makeDefaultValue();
      assert.equal(value.toString(), 'Pair { first: 10, second: 12 }');
      value.first.assign(13);
      assert.equal(value.toString(), 'Pair { first: 13, second: 12 }');
    });
  });

  describe('either', function() {
    it('enum', function() {
      let parsed = parseInline('type Boolean: either { False, True };');
      let typedecl = parsed.statements[0];
      assert.equal(typedecl.kind, 'typedecl');
      let env = new Environment();
      let type = makeType(typedecl.type, env, typedecl.id);
      let value = type.makeDefaultValue();
      assert.equal(value.toString(), 'False');
      value.assign(env.getVar('True'));
      assert.equal(value.toString(), 'True');
      assert.throws(() => {
        value.assign('Whatever');
      });
    });

    it('sum type', function() {
      let parsed = parseInline(`
        type Maybe: either {
          Something {
            thing: 10..31,
          },
          Nothing,
        };
      `);
      let typedecl = parsed.statements[0];
      assert.equal(typedecl.kind, 'typedecl');
      let env = new Environment();
      let type = makeType(typedecl.type, env, typedecl.id);
      let value = type.makeDefaultValue();
      assert.equal(value.toString(), 'Something { thing: 10 }');
      value.assign(env.getVar('Nothing'));
      assert.equal(value.toString(), 'Nothing');
      assert.throws(() => {
        value.assign('Whatever');
      });
    });
  });

  describe('alias', function() {
    it('missing', function() {
      let parsed = parseInline(`
        type FailBoat: WhatIsThis;
      `);
      let env = new Environment();
      assert.throws(() => {
        main.load(parsed, env);
      });
    });

    it('basic', function() {
      let parsed = parseInline(`
        type Boolean: either { False, True };
        type Truthful: Boolean;
      `);
      let env = new Environment();
      main.load(parsed, env);
      let value = env.getType('Truthful').makeDefaultValue();
      assert.equal(value.toString(), 'False');
    });
  });

  describe('loadPrelude', function() {
    it('prelude loads', function() {
      let prelude = main.loadPrelude();
      let booleanType = prelude.getType('Boolean');
      let booleanValue = booleanType.makeDefaultValue();
      assert.equal(booleanValue, 'False');
    });
  }); // loadPrelude

  describe('params', function() {
    it('basic', function() {
      let parsed = parseInline('param ELEVATORS: 1..1024 = 6;');
      let env = new Environment();
      let module = main.load(parsed, env);
      module.ast.typecheck();
      module.ast.execute();
      assert.equal(env.getVar('ELEVATORS').toString(), '6');
    });
  });

  describe('variable declarations', function() {
    it('basic', function() {
      let parsed = parseInline(`
        var foo: 0..10 = 8;
        var bar: 11..20;
      `);
      let env = new Environment();
      let module = main.load(parsed, env);
      module.ast.typecheck();
      module.ast.execute();
      assert.equal(env.getVar('foo').toString(), '8');
      assert.equal(env.getVar('bar').toString(), '11');
    });

    it('array', function() {
      let parsed = parseInline(`
        var bitvector: Array<Boolean>[11..13];
      `);
      let env = new Environment(main.loadPrelude());
      main.load(parsed, env);
      assert.equal(env.getVar('bitvector').toString(),
        '[11: False, 12: False, 13: False]');
    });

  });

  describe('code evaluation', function() {
    it('basic', function() {
      let prelude = main.loadPrelude();
      let env = new Environment(prelude);
      let parsed = parseInline(`
        var x : Boolean;
        var y : 1..3;
        rule foo {
          x = True;
          y = 2;
        }
      `);
      let module = main.load(parsed, env);
      module.ast.typecheck();
      module.ast.execute();
      env.rules['foo'].fire();
      assert.equal(env.getVar('x').toString(), 'True');
      assert.equal(env.getVar('y'), '2');
    });
  });
});
