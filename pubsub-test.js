'use strict';

let assert = require('assert');
let PubSub = require('./pubsub.js');

describe('pubsub.js', function() {
  describe('PubSub', function() {
    it('basic', function() {
      let ps = new PubSub();
      let count = 0;
      ps.sub(x => {count += x});
      ps.pub(3);
      assert.equal(count, 3);
      let plus2 = x => {count += 2};
      ps.sub(plus2);
      ps.pub(5);
      assert.equal(count, 10);
      ps.unsub(plus2);
      ps.pub(9);
      assert.equal(count, 19);
    });

    it('pub/sub from handlers', function() {
      let ps = new PubSub();
      let count = 0;
      let plusX = x => {count += x}; // do then don't
      let plus2 = x => {count += 2}; // don't then don't
      let times3 = x => {count *= 3}; // do then do
      let minus1 = x => {count -= 1}; // don't then do
      let manip = () => {
        ps.unsub(plusX);
        ps.unsub(plus2);
        ps.sub(minus1);
      };
      ps.sub(plusX);
      ps.sub(manip);
      ps.sub(plus2);
      ps.sub(times3);
      ps.pub(5);
      ps.unsub(manip);
      assert.equal(count, 15);
      ps.pub(9);
      assert.equal(count, 44);
    });

    it('duplicates', function() {
      let ps = new PubSub();
      let count = 0;
      let plusX = x => {count += x}; // do then don't
      ps.sub(plusX);
      ps.sub(plusX);
      ps.pub(5);
      assert.equal(count, 10);
      ps.unsub(plusX);
      ps.pub(5);
      assert.equal(count, 15);
    });

    it('unsub invalid', function() {
      let ps = new PubSub();
      let count = 0;
      let plusX = x => {count += x}; // do then don't
      ps.sub(plusX);
      ps.unsub(() => 'q');
      ps.pub(5);
      assert.equal(count, 5);
    });
  });
});
