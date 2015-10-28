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

    it('with index', function() {
      let module = testing.run(`
        type Digit : 0..9;
        var ints : Array<Digit>[4..6];
        for i, v in ints {
          v = i;
        }
      `);
      assert.equal(module.env.getVar('ints').toString(),
        '[4: 4, 5: 5, 6: 6]');
    });
  });
});
