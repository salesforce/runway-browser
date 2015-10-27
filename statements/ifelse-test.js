"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('statements/ifelse.js', function() {
  describe('ifelse', function() {

    it('if-else False', function() {
      let module = testing.run(`
        var x : 0..2; 
        if False {
          x = 1;
        } else {
          x = 2;
        }
      `);
      assert.equal(module.env.getVar('x').toString(), '2');
    });

    it('if-else True', function() {
      let module = testing.run(`
        var x : 0..2; 
        if True {
          x = 1;
        } else {
          x = 2;
        }
      `);
      assert.equal(module.env.getVar('x').toString(), '1');
    });

    it('if-else expression', function() {
      let module = testing.run(`
        var x : 0..2; 
        if True == True {
          x = 1;
        } else {
          x = 2;
        }
      `);
      assert.equal(module.env.getVar('x').toString(), '1');
    });

    it('if-only False', function() {
      let module = testing.run(`
        var x : 0..2; 
        if False {
          x = 1;
        }
      `);
      assert.equal(module.env.getVar('x').toString(), '0');
    });

    it('if-only True', function() {
      let module = testing.run(`
        var x : 0..2; 
        if True {
          x = 1;
        }
      `);
      assert.equal(module.env.getVar('x').toString(), '1');
    });
  });
});
