"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('statements/match.js', function() {
  describe('match', function() {
    it('enum', function() {
      let module = testing.run(`
        var a : 0..2;
        var t : Boolean = True;
        match t {
          False => { a = 1; },
          True => { a = 2; },
        }
      `);
      assert.equal(module.env.getVar('a').toString(), '2');
    });

    it('with fields', function() {
      let module = testing.run(`
        type T : either {
          Nothing,
          Something { digit: 0..9 },
        };
        var t : T = Something { digit: 3 };
        var a : 0..10;
        match t {
          Nothing => { a = 10; },
          Something as s => { a = s.digit; },
        }
      `);
      assert.equal(module.env.getVar('a').toString(), '3');
    });

    it('assign same variant is ok', function() {
      let module = testing.run(`
        type T : either {
          Nothing,
          Something { digit: 0..9 },
        };
        var t : T = Something { digit: 3 };
        var a : 0..10;
        match t {
          Nothing => { a = 10; },
          Something as s => {
            s = Something { digit: 9 };
            a = s.digit;
          },
        }
      `);
      assert.equal(module.env.getVar('a').toString(), '9');
    });

    it('assign different variant is not ok', function() {
      assert.throws(() => testing.run(`
        type T : either {
          Nothing,
          Something { digit: 0..9 },
        };
        var t : T = Something { digit: 3 };
        match t {
          Nothing => {},
          Something as s => {
            s = Nothing;
          },
        }
      `));
    });
  });
});
