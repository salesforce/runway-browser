"use strict";

let errors = require('../errors.js');

let factory = {};
module.exports = factory;
// export empty object before requiring circular dependencies

let statements = new Map([
  ['assign', require('./assign.js')],
  ['break', require('./break.js')],
  ['continue', require('./continue.js')],
  ['do', require('./do.js')],
  ['foreach', require('./foreach.js')],
  ['ifelse', require('./ifelse.js')],
  ['match', require('./match.js')],
  ['paramdecl', require('./paramdecl.js')],
  ['print', require('./print.js')],
  ['rule', require('./rule.js')],
  ['rulefor', require('./rulefor.js')],
  ['sequence', require('./sequence.js')],
  ['typedecl', require('./typedecl.js')],
  ['vardecl', require('./vardecl.js')],
]);

let make = function(parsed, env) {
  if (parsed !== undefined && 'kind' in parsed) {
    let statement = statements.get(parsed.kind);
    if (statement !== undefined) {
      return new statement(parsed, env);
    }
  }
  let o = JSON.stringify(parsed, null, 2);
  throw new errors.Unimplemented(`Unknown statement: ${o}`);
}
factory.make = make;
