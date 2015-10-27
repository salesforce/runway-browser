"use strict";

let errors = require('../errors.js');

let kinds = [
  'assign',
  'foreach',
  'ifelse',
  'match',
  'paramdecl',
  'print',
  'rule',
  'rulefor',
  'sequence',
  'typedecl',
  'vardecl',
];

// map from kind to Statement subclass
let statements = new Map(kinds.map((kind) => [kind, require(`./${kind}.js`)]));

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
module.exports = make;
