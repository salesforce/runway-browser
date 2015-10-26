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
      assert.deepEqual(input.lookup(0), {
        line: 1,
        col: 1,
        lineStartOffset: 0,
        lineEndOffset: 3,
        charOffset: 0,
      });


      assert.deepEqual(input.lookup(2), {
        line: 1,
        col: 3,
        lineStartOffset: 0,
        lineEndOffset: 3,
        charOffset: 2,
      });

      assert.deepEqual(input.lookup(3), {
        line: 1,
        col: 4,
        lineStartOffset: 0,
        lineEndOffset: 3,
        charOffset: 3,
      });

      assert.deepEqual(input.lookup(4), {
        line: 2,
        col: 1,
        lineStartOffset: 4,
        lineEndOffset: 7,
        charOffset: 4,
      });

      assert.deepEqual(input.lookup(7), {
        line: 2,
        col: 4,
        lineStartOffset: 4,
        lineEndOffset: 7,
        charOffset: 7,
      });
    });

    it('highlight', function() {
      let input = new Input('foo.txt', alphabet);
      let h = (o) => input.highlight(input.lookup(o));
      assert.equal(h(0), 'abc\n^');
      assert.equal(h(2), 'abc\n  ^');
      assert.equal(h(3), 'abc\n   ^');
      assert.equal(h(4), 'def\n^');
      assert.equal(h(7), 'def\n   ^');
    });

    it('nonewline', function() {
      let input = new Input('test', 'abc');
      assert.deepEqual(input.lookup(3), {
        line: 1,
        col: 4,
        lineStartOffset: 0,
        lineEndOffset: 3,
        charOffset: 3,
      });
      assert.equal(input.highlight(input.lookup(3)), 'abc\n   ^');
    });
  });
});
