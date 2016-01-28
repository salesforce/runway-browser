"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('statements/return.js', function() {
  describe('return', function() {

    it('returns copy, not ref', function() {
      let module = testing.run(`
        type Box : record {
          bool: Boolean,
        };
        var bools : Array<Box>[1..2];
        function getFirst() -> Box {
          for box in bools {
            return box;
          }
        }
        var mbox : Box = getFirst();
        mbox.bool = True;
      `);
      assert.equal(module.env.getVar('bools').toString(),
        '[1: Box { bool: False }, 2: Box { bool: False }]');
      assert.equal(module.env.getVar('mbox').toString(),
        'Box { bool: True }');
    });
  });
});
