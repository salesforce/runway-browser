"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('types/array.js', function() {
  describe('Array', function() {
    it('basic', function() {
      let module = testing.run(`
        var bools : Array<Boolean>[1..3];
        bools[3] = True;
        var a : Boolean = bools[1];
        var b : Boolean = bools[3];
      `);
      assert.equal(module.env.getVar('bools').toString(),
        '[1: False, 2: False, 3: True]');
      assert.equal(module.env.getVar('a').toString(),
        'False');
      assert.equal(module.env.getVar('b').toString(),
        'True');
    });

    it('bounds', function() {
      assert.throws(() => testing.run(`
        var bools : Array<Boolean>[1..3];
        bools[4] = True;
      `));
    });

    it('compound', function() {
      let module = testing.run(`
        type DigitBox : record { digit: 0..9 };
        var digits : Array<DigitBox>[1..3];
        digits[2] = DigitBox { digit: 8 };
        digits[3].digit = 4;
      `);
      assert.equal(module.env.getVar('digits').toString(),
        '[1: DigitBox { digit: 0 }, ' +
        '2: DigitBox { digit: 8 }, ' +
        '3: DigitBox { digit: 4 }]');
    });
  });
});
