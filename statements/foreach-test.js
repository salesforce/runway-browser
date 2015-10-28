"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('statements/foreach.js', function() {
  describe('foreach', function() {

    it('basic', function() {
      let module = testing.run(`
        var bools : Array<Boolean>[1..3];
        bools[2] = True;
        for bool in bools {
          bool = (bool == False);
        }
      `);
      assert.equal(module.env.getVar('bools').toString(),
        '[1: True, 2: False, 3: True]');
    });
  });
});
