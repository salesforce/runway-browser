"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('expressions/recordvalue.js', function() {
  describe('record value', function() {

    it('either', function() {
      let module = testing.run(`
        type Elevator: record {
            location: either {
                AtFloor {
                    at: 1..5,
                },
                Between {
                    next: 1..5,
                },
            },
        }
        var elevator : Elevator;
        elevator.location = AtFloor { at: 3 };
        var floor : 1..5;
        match elevator.location {
            AtFloor as a => { floor = a.at; },
            Between as b => { floor = b.next; },
        }
      `);
      assert.equal(module.env.getVar('floor').toString(), '3');
    });

  });
});
