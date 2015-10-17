"use strict";

let assert = require('assert');
let Input = require('./input.js');

let alphabet = `abc
def
ghi
jkl
`;

describe('input.js', function() {
  describe('Input', function() {
    it('lookup', function() {
      let input = new Input('foo.txt', alphabet);
      assert.deepEqual({
        line: 1,
        col: 1,
        lineStartOffset: 0,
        lineEndOffset: 3,
        charOffset: 0,
      }, input.lookup(0));

      assert.deepEqual({
        line: 1,
        col: 3,
        lineStartOffset: 0,
        lineEndOffset: 3,
        charOffset: 2,
      }, input.lookup(2));

      assert.deepEqual({
        line: 2,
        col: 1,
        lineStartOffset: 4,
        lineEndOffset: 7,
        charOffset: 4,
      }, input.lookup(4));
    });

    it('highlight', function() {
      let input = new Input('foo.txt', alphabet);
      let h = (o) => input.highlight(input.lookup(o));
      assert.equal('abc\n^', h(0));
      assert.equal('abc\n  ^', h(2));
      assert.equal('def\n^', h(4));
    });
  });
});
