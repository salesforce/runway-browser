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

    it('break', function() {
      let module = testing.run(`
        type Digit : 0..9;
        var ints : Array<Digit>[0..2];
        ints[0] = 4;
        ints[1] = 5;
        ints[2] = 5;
        var fives : 0..100 = 0;
        for v in ints {
          if v == 5 {
            fives = fives + 1;
            break;
          }
        }
      `);
      assert.equal(module.env.getVar('fives').toString(), '1');
    });
  });
});
