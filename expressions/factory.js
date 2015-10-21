"use strict";

let kinds = [
  'apply',
  'id',
  'index',
  'lookup',
  'matches',
  'number',
  'recordvalue',
];

// map from kind to Statement subclass
let expressions = new Map(kinds.map((kind) => [kind, require(`./${kind}.js`)]));

let make = function(parsed, env) {
  let expression = expressions.get(parsed.kind);
  if (expression !== undefined) {
    return new expression(parsed, env);
  }
  let o = JSON.stringify(parsed, null, 2);
  throw Error(`Unknown expression: ${o}`);
}

module.exports = make;
