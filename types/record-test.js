"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('types/record.js', function() {
  describe('record', function() {
    it('basic', function() {
      let module = testing.run(`
        type DigitBox : record {
          digit: 0..9,
        }
        var a : DigitBox;
        var b : DigitBox = DigitBox { digit: 3 };
      `);
      assert.equal(module.env.getVar('a').toString(), 'DigitBox { digit: 0 }');
      assert.equal(module.env.getVar('b').toString(), 'DigitBox { digit: 3 }');
    });
  });
});
