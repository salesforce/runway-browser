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
      module.env.rules['setToTrue'].fire();
      assert.equal(module.env.getVar('bool').toString(), 'True');
    });
  });
});
