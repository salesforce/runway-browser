"use strict";

let assert = require('assert');
let Changesets = require('./changesets.js');


describe('changesets.js', function() {
  describe('Changeset', function() {
    describe('compareJSON', function() {
      let cmp = (x, y) => Changesets.compareJSON(x, y).join(' ');

      it('globals', function() {
        assert.equal(cmp(
          {a: 1, b: 2},
          {a: 1, b: 3, c: 4}),
          'b c');
      });

      it('record', function() {
        assert.equal(cmp(
          {a: {x: 3, y: 4}},
          {a: {x: 3}}),
          'a');
        assert.equal(cmp(
          {a: {x: 3}},
          {a: {x: 3, y: 4}}),
          'a');
        assert.equal(cmp(
          {a: {x: 3, y: 5}},
          {a: {x: 4, y: 5}}),
          'a.x');
      });

      it('either', function() {
        assert.equal(cmp(
          {a: 'Red', b: 'Blue'},
          {a: 'Green', b: 'Blue'}),
          'a');
        assert.equal(cmp(
          {a: 'Red', b: 'Blue'},
          {a: {tag: 'Yellow', fields: {y: 3}}, b: 'Blue'}),
          'a');
        assert.equal(cmp(
          {a: {tag: 'Yellow', fields: {y: 2}}, b: 'Blue'},
          {a: {tag: 'Yellow', fields: {y: 3}}, b: 'Blue'}),
          'a!Yellow.y');
      });

      it('array', function() {
        assert.equal(cmp(
          {a: [[1, 'one'], [2, 'two']]},
          {a: [[1, 'one'], [2, 'two']]}),
          '');
        assert.equal(cmp(
          {a: [[1, 'one']]},
          {a: [[1, 'one'], [2, 'two']]}),
          'a');
        assert.equal(cmp(
          {a: [[1, 'one'], [2, 'two']]},
          {a: [[1, 'one'], [2, 'bar']]}),
          'a[2]');
      });
    });

    it('affected', function() {
      let cs = [
        'a', 'b[2]', 'c.x',
      ];
      assert.equal(Changesets.affected(cs, ['a']), true);
      assert.equal(Changesets.affected(cs, ['b[2].x']), true);
      assert.equal(Changesets.affected(cs, ['c.y']), false);
    });
  });
});
