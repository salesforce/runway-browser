"use strict";

let ArrayType = require('./array.js');
let Either = require('./either.js');
let NumberType = require('./number.js');
let RangeType = require('./range.js');
let RecordType = require('./record.js');


let subtypeOf = function(sub, par) {
  if (sub == par) {
    return true;
  }
  if (sub instanceof NumberType &&
    par instanceof RangeType) {
    // let runtime check handle this for now
    return true;
  }
  if (sub instanceof Either.Variant &&
    par instanceof Either.Type &&
    sub.eithertype == par) {
    return true;
  }
  return false;
};

let haveEquality = function(left, right) {
  if (subtypeOf(left, right)) {
    return true;
  }
  if (subtypeOf(right, left)) {
    return true;
  }
  if (left instanceof Either.Variant &&
    right instanceof Either.Variant &&
    left.eithertype == right.eithertype) {
    return true;
  }
  return false;
}
module.exports = {
  subtypeOf: subtypeOf,
  haveEquality: haveEquality,
};
