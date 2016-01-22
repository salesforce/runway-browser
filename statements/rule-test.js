"use strict";

let assert = require('assert');
let testing = require('../testing.js');

describe('statements/rule.js', function() {
  describe('rule', function() {
    it('basic', function() {
      let module = testing.run(`
        var bool : Boolean;
        rule setToTrue {
          bool = True;
        }
      `);
      assert.equal(module.env.getVar('bool').toString(), 'False');
      module.env.getRule('setToTrue').fire();
      assert.equal(module.env.getVar('bool').toString(), 'True');
    });

    it('variables reset to start', function() {
      let module = testing.run(`
        rule setToTrue {
          var bool : Boolean;
          assert !bool;
          bool = True;
        }
      `);
      module.env.getRule('setToTrue').fire();
      module.env.getRule('setToTrue').fire();
    });

    it('variables reset to start in nested environments', function() {
      let module = testing.run(`
        rule setToTrue {
          var done : Boolean = False;
          while !done {
            var bool : Boolean;
            assert !bool;
            bool = True;
            done = True;
          }
        }
      `);
      module.env.getRule('setToTrue').fire();
      module.env.getRule('setToTrue').fire();
    });
  });
});
