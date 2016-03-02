'use strict';

let assert = require('assert');
let Execution = require('./execution.js');

describe('execution.js', function() {
  describe('Execution', function() {
    let execution = new Execution({msg: 'A1', i: 1});
    let A1 = execution.last();
    let A2 = A1.addEvent({msg: 'A2', i: 2});
    let A3 = A2.addEvent({msg: 'A3', i: 3});
    let B3 = A2.addEvent({msg: 'B3', i: 4});

    it('addEvent, map', function() {
      assert.equal(A1.map(e => e.msg).join(' '),
                   'A1');
      assert.equal(A2.map(e => e.msg).join(' '),
                   'A1 A2');
      assert.equal(A3.map(e => e.msg).join(' '),
                   'A1 A2 A3');
      assert.equal(B3.map(e => e.msg).join(' '),
                   'A1 A2 B3');
      assert.equal(execution.map(e => e.msg).join(' '),
                   'A1 A2 A3');
      assert.equal(B3.execution.map(e => e.msg).join(' '),
                   'A1 A2 B3');
      
    });

    it('preceding', function() {
      let find = (e, i) => e.preceding(e => (e.i <= i));
      assert.equal(find(execution, 1).getEvent().msg, 'A1');
      assert.equal(find(execution, 2).getEvent().msg, 'A2');
      assert.equal(find(execution, 3).getEvent().msg, 'A3');
      assert.equal(find(execution, 4).getEvent().msg, 'A3');
      assert.equal(find(execution, 0), undefined);
      assert.equal(find(B3.execution, 1).getEvent().msg, 'A1');
      assert.equal(find(B3.execution, 2).getEvent().msg, 'A2');
      assert.equal(find(B3.execution, 3).getEvent().msg, 'A2');
      assert.equal(find(B3.execution, 4).getEvent().msg, 'B3');
      assert.equal(find(B3.execution, 5).getEvent().msg, 'B3');
    });
  });
});
