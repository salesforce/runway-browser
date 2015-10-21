"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('expressions/lookup.js', function() {
  describe('lookup', function() {

    it('basic', function() {
      let module = testing.run(`
        type T : record {
          inner: Boolean,
        }
        var t : T;
        var x : Boolean = True;
        x = t.inner;
      `);
      assert.equal(module.env.getVar('x').toString(), 'False');
    });

  });
});
