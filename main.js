var parser = require('./parser.js');

var out = function(o) {
  console.log(JSON.stringify(o, null, 2));
};

var constructDefaultHelper = function(fieldtype) {
  var value = {};
  if (fieldtype.kind == 'range') {
    value['value'] = fieldtype.low;
  } else if (fieldtype.kind == 'record') {
    fieldtype.fields.forEach((field) => {
      value[field.id.value] = constructDefaultHelper(field.type);
    });
  } else if (fieldtype.kind == 'either') {
    var first = fieldtype.fields[0];
    value['value'] = first.id.value;
    value[first.id.value] = constructDefaultHelper(first.type);
  } else {
    var o = JSON.stringify(fieldtype, null, 2);
    throw Error(`Unknown field type: ${o}`);
  }
  return value;
};

var constructDefault = function(typedecl) {
  var value = {
    type: typedecl.id.value,
  };
  Object.assign(value, constructDefaultHelper(typedecl.type));
  return value;
};

module.exports = {
  constructDefault: constructDefault,
};

if (require.main === module) {
  var r = parser.parseFile('input.model');
  if (!r.status) {
    parser.consoleOutput(r);
    return;
  }
  ast = r.value;
  person = ast[8];
  out(person);
  out(constructDefault(person));
}
