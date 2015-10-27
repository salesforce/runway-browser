"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('types/either.js', function() {
  describe('either', function() {
    it('basic', function() {
      let module = testing.run(`
        type Maybe : either {
          Nothing,
          Something { digit: 0..9 },
        }
        var a : Maybe;
        var b : Boolean = (Something { digit: 3 } == Something { digit: 3 });
        var c : Boolean = (Something { digit: 3 } == Something { digit: 4 });
        var d : Boolean = (Something { digit: 3 } == Nothing);
        var e : Boolean = (Nothing == Something { digit: 0 });
      `);
      assert.equal(module.env.getVar('a').toString(), 'Nothing');
      assert.equal(module.env.getVar('b').toString(), 'True');
      assert.equal(module.env.getVar('c').toString(), 'False');
      assert.equal(module.env.getVar('d').toString(), 'False');
    });
  });
});
