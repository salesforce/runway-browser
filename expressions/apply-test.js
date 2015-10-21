"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('expressions/apply.js', function() {
  describe('apply', function() {

    it('equals', function() {
      let module = testing.run(`
        var ff : Boolean = False == False;
        var ft : Boolean = False == True; 
        var tf : Boolean = True == False; 
        var tt : Boolean = True == True; 
      `);
      assert.equal(module.env.getVar('ff').toString(), 'True');
      assert.equal(module.env.getVar('ft').toString(), 'False');
      assert.equal(module.env.getVar('tf').toString(), 'False');
      assert.equal(module.env.getVar('tt').toString(), 'True');
    });

    it('equals complex', function() {
      let module = testing.run(`
        var ft : Boolean = False == (False == False); 
      `);
      assert.equal(module.env.getVar('ft').toString(), 'False');
    });

  });
});
