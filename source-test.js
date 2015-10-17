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
      assert.equal('chars 10-20', source.toString());
      source.setInput(new Input('foo.txt', alphabet));
      assert.equal('foo.txt: line 3, col 3 to line 6, col 1', source.toString());
    });
  });
});
