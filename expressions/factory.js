"use strict";

let errors = require('../errors.js');

let factory = {};
module.exports = factory;
// export empty object before requiring circular dependencies

let expressions = new Map([
  ['apply', require('./apply.js')],
  ['id', require('./id.js')],
  ['index', require('./index.js')],
  ['lookup', require('./lookup.js')],
  ['number', require('./number.js')],
  ['recordvalue', require('./recordvalue.js')],
]);

let make = function(parsed, env) {
  let expression = expressions.get(parsed.kind);
  if (expression !== undefined) {
    return new expression(parsed, env);
  }
  let o = JSON.stringify(parsed, null, 2);
  throw new errors.Unimplemented(`Unknown expression: ${o}`);
}
factory.make = make;
