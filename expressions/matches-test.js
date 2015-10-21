"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('expressions/matches.js', function() {
  describe('matches', function() {

    it('basic', function() {
      return; // TODO: need type info on left-hand side type to implement
      let module = testing.run(`
        type Maybe : either {
          Something { thing: 1..2 },
          Nothing
        }
        var x : Maybe;
        var a : Boolean = x matches Something;
        var b : Boolean = x matches Nothing; 
        x = Nothing;
        var c : Boolean = x matches Something;
        var d : Boolean = x matches Nothing; 
      `);
      assert.equal(module.env.getVar('a').toString(), 'True');
      assert.equal(module.env.getVar('b').toString(), 'False');
      assert.equal(module.env.getVar('c').toString(), 'False');
      assert.equal(module.env.getVar('d').toString(), 'True');
    });

  });
});
