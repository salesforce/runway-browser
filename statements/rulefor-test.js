"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('statements/rulefor.js', function() {
  describe('rulefor', function() {
    it('basic', function() {
      let module = testing.run(`
        var bools : Array<Boolean>[1..3];
        bools[2] = True;
        var x : Boolean;
        rule invert for bool in bools {
          bool = (bool == False);
        }
      `);
      assert.equal(module.env.getVar('bools').toString(),
        '[1: False, 2: True, 3: False]');
      module.env.getRule('invert').fire(3);
      assert.equal(module.env.getVar('bools').toString(),
        '[1: False, 2: True, 3: True]');
    });

    it('with index', function() {
      let module = testing.run(`
        type Digit : 0..9;
        var ints : Array<Digit>[4..6];
        rule setToIndex for i, v in ints {
          v = i;
        }
      `);
      assert.equal(module.env.getVar('ints').toString(),
        '[4: 0, 5: 0, 6: 0]');
      module.env.getRule('setToIndex').fire(5);
      assert.equal(module.env.getVar('ints').toString(),
        '[4: 0, 5: 5, 6: 0]');
      module.env.getRule('setToIndex').fire();
      assert.equal(module.env.getVar('ints').toString(),
        '[4: 4, 5: 5, 6: 0]');
    });

  });
});

