"use strict";

let ArrayType = require('./array.js');
let Either = require('./either.js');
let BlackHoleNumberType = require('./blackholenumber.js').Type;
let NumberType = require('./number.js').Type;
let RangeType = require('./range.js').Type;
let RecordType = require('./record.js');
let VarLen = require('./varlen.js');


let subtypeOf = function(sub, par) {
  if (sub.equals(par)) {
    return true;
  }
  if (isNumeric(sub) && isNumeric(par)) {
    // let runtime check handle ranges for now
    return true;
  }
  if (sub instanceof Either.Variant &&
    par instanceof Either.Type &&
    sub.parenttype == par) {
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
    left.parenttype == right.parenttype) {
    return true;
  }
  return false;
};

let isNumeric = function(t) {
  return (t instanceof NumberType ||
    t instanceof RangeType ||
    t instanceof BlackHoleNumberType);
};

let haveOrdering = function(left, right) {
  return isNumeric(left) && isNumeric(right);
};

let implementsSet = function(t) {
  // push pop remove contains empty full
  return (t instanceof VarLen.SetType ||
    t instanceof VarLen.OrderedSetType ||
    t instanceof VarLen.MultiSetType ||
    t instanceof VarLen.VectorType);
}

let implementsIterable = function(t) {
  // t needs .valueType, .indexType
  // output of evaluating value needs .forEach((v, i) => ...)
  return (t instanceof ArrayType.Type ||
    implementsSet(t));
}

let implementsIndexable = function(t) {
  return (t instanceof ArrayType.Type ||
    implementsSet(t));
}

module.exports = {
  subtypeOf: subtypeOf,
  haveEquality: haveEquality,
  haveOrdering: haveOrdering,
  isNumeric: isNumeric,
  implementsSet: implementsSet,
  implementsIterable: implementsIterable,
  implementsIndexable: implementsIndexable,
};
