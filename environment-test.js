"use strict";

let assert = require('assert');
let Environment = require('./environment.js');

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
      assert.deepEqual('footype', inner.getType('foo'));
      assert.deepEqual('bartype', inner.getType('bar'));
      assert.deepEqual(['foo'], outer.getTypeNames());
      assert.deepEqual(['foo', 'bar'], inner.getTypeNames());
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
      assert.deepEqual('foovar', inner.getVar('foo'));
      assert.deepEqual('barvar', inner.getVar('bar'));
      assert.deepEqual(['foo'], outer.getVarNames());
      assert.deepEqual(['foo', 'bar'], inner.getVarNames());
    });
  });
});
