"use strict";

let assert = require('assert');
let Environment = require('./environment.js').Environment;

describe('environment.js', function() {
  describe('Environment', function() {
    it('assignType, getType', function() {
      let outer = new Environment();
      let inner = new Environment(outer);
      outer.assignType('foo', 'footype');
      inner.assignType('bar', 'bartype');
      inner.assignVar('bar', 'barvar');
      assert.throws(() => {
        inner.assignType('foo', 'fail');
      }, Error);
      assert.deepEqual(inner.getType('foo'), 'footype');
      assert.deepEqual(inner.getType('bar'), 'bartype');
      assert.deepEqual(outer.getTypeNames(), ['foo']);
      assert.deepEqual(inner.getTypeNames(), ['foo', 'bar']);
    });

    it('assignVar, getVar', function() {
      let outer = new Environment();
      let inner = new Environment(outer);
      outer.assignVar('foo', 'foovar');
      inner.assignVar('bar', 'barvar');
      inner.assignType('bar', 'bartype');
      assert.throws(() => {
        inner.assignVar('foo', 'fail');
      }, Error);
      assert.deepEqual(inner.getVar('foo'), 'foovar');
      assert.deepEqual(inner.getVar('bar'), 'barvar');
      assert.deepEqual(outer.getVarNames(), ['foo']);
      assert.deepEqual(inner.getVarNames(), ['foo', 'bar']);
    });
  });
});
