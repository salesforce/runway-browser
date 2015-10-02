"use strict";

let parser = require('./parser.js');

let out = function(o) {
  console.log(JSON.stringify(o, null, 2));
};

let constructDefaultHelper = function(fieldtype) {
  let value = {};
  if (fieldtype.kind == 'range') {
    value['value'] = fieldtype.low;
  } else if (fieldtype.kind == 'record') {
    fieldtype.fields.forEach((field) => {
      value[field.id.value] = constructDefaultHelper(field.type);
    });
  } else if (fieldtype.kind == 'either') {
    let first = fieldtype.fields[0];
    value['value'] = first.id.value;
    value[first.id.value] = constructDefaultHelper(first.type);
  } else {
    let o = JSON.stringify(fieldtype, null, 2);
    throw Error(`Unknown field type: ${o}`);
  }
  return value;
};

let constructDefault = function(typedecl) {
  let value = {
    type: typedecl.id.value,
  };
  Object.assign(value, constructDefaultHelper(typedecl.type));
  return value;
};

module.exports = {
  constructDefault: constructDefault,
};

if (require.main === module) {
  let r = parser.parseFile('input.model');
  if (!r.status) {
    parser.consoleOutput(r);
    return;
  }
  let ast = r.value;
  let person = ast[8];
  out(person);
  out(constructDefault(person));
}
