"use strict";

let assert = require('assert');
let Environment = require('./environment.js');
let Input = require('./input.js');
let Parser = require('./parser.js');
let main = require('./main.js');
let Type = require('./type.js');
let makeType = require('./typefactory.js');

let parseInline = (text) => Parser.parse(new Input('unit test', text));

describe('main.js', function() {

  describe('range', function() {
    it('range', function() {
      let parsed = parseInline('type DoubleDigits: 10..99;');
      let typedecl = parsed[0];
      assert.equal('typedecl', typedecl.kind);
      let env = new Environment();
      let type = makeType(typedecl.type, env, typedecl.id);
      let value = type.makeDefaultValue();
      assert.equal('DoubleDigits(10)',
        value.toString());
      value.assign(11);
      assert.equal('DoubleDigits(11)',
        value.toString());
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
      let typedecl = parsed[0];
      assert.equal('typedecl', typedecl.kind);
      let env = new Environment();
      let type = makeType(typedecl.type, env, typedecl.id);
      let value = type.makeDefaultValue();
      assert.equal('Pair { first: 10, second: 12 }',
        value.toString());
      value.first.assign(13);
      assert.equal('Pair { first: 13, second: 12 }',
        value.toString());
    });
  });

  describe('either', function() {
    it('enum', function() {
      let parsed = parseInline('type Boolean: either { False, True };');
      let typedecl = parsed[0];
      assert.equal('typedecl', typedecl.kind);
      let env = new Environment();
      let type = makeType(typedecl.type, env, typedecl.id);
      let value = type.makeDefaultValue();
      assert.equal('False',
        value.toString());
      value.assign('True');
      assert.equal('True',
        value.toString());
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
      let typedecl = parsed[0];
      assert.equal('typedecl', typedecl.kind);
      let env = new Environment();
      let type = makeType(typedecl.type, env, typedecl.id);
      let value = type.makeDefaultValue();
      assert.equal('Something { thing: 10 }',
        value.toString());
      value.assign('Nothing');
      assert.equal('Nothing',
        value.toString());
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
      assert.equal('False',
        value.toString());
    });
  });

  describe('loadPrelude', function() {
    it('prelude loads', function() {
      let prelude = main.loadPrelude();
      let booleanType = prelude.getType('Boolean');
      let booleanValue = booleanType.makeDefaultValue();
      assert.equal('False', booleanValue.tag);
    });
  }); // loadPrelude

  describe('params', function() {
    it('basic', function() {
      let parsed = parseInline('param ELEVATORS: 1..1024 = 6;');
      let env = new Environment();
      main.load(parsed, env);
      assert.equal(6, env.getVar('ELEVATORS').toString());
    });
  });

  describe('variable declarations', function() {
    it('basic', function() {
      let parsed = parseInline(`
        var foo: 0..10 = 8;
        var bar: 11..20;
      `);
      let env = new Environment();
      main.load(parsed, env);
      assert.equal(8, env.getVar('foo').toString());
      assert.equal(11, env.getVar('bar').toString());
    });

    it('array', function() {
      let parsed = parseInline(`
        var bitvector: Array<Boolean>[11..13];
      `);
      let env = new Environment(main.loadPrelude());
      main.load(parsed, env);
      assert.equal('[11: False, 12: False, 13: False]',
        env.getVar('bitvector').toString());
    });

  });

  describe('code evaluation', function() {
    it('basic', function() {
      let prelude = main.loadPrelude();
      let env = new Environment(prelude);
      let parsed = parseInline(`
        var x : Boolean;
        rule foo {
          x = True;
        }
      `);
      main.load(parsed, env);
      env.rules['foo'].evaluate();
      assert.equal('True', env.getVar('x'));
    });
  });
});
