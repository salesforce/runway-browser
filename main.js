"use strict";

let parser = require('./parser.js');
let Environment = require('./environment.js');

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

let loadPrelude = function() {
  let prelude = new Environment();
  let r = parser.parseFile('prelude.model');
  if (!r.status) {
    throw Error(r);
  }
  r.value.forEach((decl) => {
    if (decl.kind == 'typedecl') {
      prelude.assignType(decl.id.value, decl);
    } else {
      let o = JSON.stringify(fieldtype, null, 2);
      throw Error(`unknown statement: ${o}`);
    }
  });
  return prelude;
}
module.exports = {
  constructDefault: constructDefault,
  loadPrelude: loadPrelude,
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
