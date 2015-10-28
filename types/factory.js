"use strict";

let errors = require('../errors.js');
let ArrayType = require('./array.js');
let EitherType = require('./either.js').Type;
let RangeType = require('./range.js').Type;
let RecordType = require('./record.js');

let make = function(decl, env, name) {
  if (decl.kind == 'range') {
    return new RangeType(decl, env, name);
  } else if (decl.kind == 'record') {
    return new RecordType(decl, env, name);
  } else if (decl.kind == 'either') {
    return new EitherType(decl, env, name);
  } else if (decl.kind == 'alias') {
    let t = env.getType(decl.value);
    if (t === undefined) {
      throw new errors.Lookup(`Unknown type ${decl.value}`);
    }
    return t;
  } else if (decl.kind == 'generic') {
    if (decl.base.value == 'Array') {
      return new ArrayType(decl, env, name);
    } else {
      throw new errors.Unimplemented(`Unknown type '${decl.base.value}'`);
    }
  }
  let o = JSON.stringify(decl, null, 2);
  throw new errors.Unimplemented(`Unknown type '${name}': ${o}`);
}
module.exports = make;
