"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('statements/assign.js', function() {
  describe('assign', function() {

    it('LHS is simple', function() {
      let module = testing.run(`
        var x : 0..2; 
        x = 1;
      `);
      assert.equal(module.env.getVar('x').toString(), '1');
    });

    it('RHS is expression', function() {
      let module = testing.run(`
        var x : Boolean = False; 
        x = False == False;
      `);
      assert.equal(module.env.getVar('x').toString(), 'True');
    });

    it('LHS has lookups', function() {
      let module = testing.run(`
        type T : record {
          first: 0..2,
          second: 0..2,
        }
        var x : T;
        x.first = 1;
        x.second = 2;
      `);
      assert.equal(module.env.getVar('x').toString(), 'T { first: 1, second: 2 }');
    });
  });
});
