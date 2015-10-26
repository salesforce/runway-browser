"use strict";

let assert = require('assert');
let Input = require('./input.js');
let Source = require('./source.js');

let alphabet = `abc
def
ghi
jkl
mno
pqr
stu
vwx
yz
`;

describe('source.js', function() {
  describe('Source', function() {
    it('basic', function() {
      let source = new Source(10, 20);
      assert.equal(source.toString(), 'chars 10-20');
      source.setInput(new Input('foo.txt', alphabet));
      assert.equal(source.toString(), 'foo.txt: line 3, col 3 to line 6, col 1');
    });
  });
});
