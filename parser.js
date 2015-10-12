"use strict";

let Parsimmon = require('./bower_components/parsimmon/build/parsimmon.commonjs.js');
let fs = require('fs');
let input = fs.readFileSync('input.model').toString();

// like .mark() except puts start and end in same object as value
Parsimmon.Parser.prototype.source = function() {
  return Parsimmon.Parser.prototype.mark.call(this).map((marked) => {
    marked.value.start = marked.start;
    marked.value.end = marked.end;
    return marked.value;
  });
}


let alt = Parsimmon.alt;
let lazy = Parsimmon.lazy;
let optWhitespace = Parsimmon.optWhitespace;
let regex = Parsimmon.regex;
let sepBy = Parsimmon.sepBy;
let seq = Parsimmon.seq;
let seqMap = Parsimmon.seqMap;
let string = Parsimmon.string;
let whitespace = Parsimmon.whitespace;

let sepByOptTrail = function(content, separator) {
  return sepBy(content, separator)
    .skip(separator.or(Parsimmon.succeed()));
}
let comment = regex(/\/\/[^\n]*/).desc('single-line comment');
let lexeme = function(p) {
  return p.skip(whitespace.or(comment).many());
}
let arrow = lexeme(string('->'));
let colon = lexeme(string(':'));
let comma = lexeme(string(','));
let dots = lexeme(string('..'));
let equals = lexeme(string('='));
let langle = lexeme(string('<'));
let lbrace = lexeme(string('{'));
let lparen = lexeme(string('('));
let minus = lexeme(string('-'));
let plus = lexeme(string('+'));
let rangle = lexeme(string('>'));
let rbrace = lexeme(string('}'));
let rparen = lexeme(string(')'));
let semicolon = lexeme(string(';'));
let times = lexeme(string('*'));

let re = /([0-9]+)([a-z]+)/i;
let numberWithUnit = lexeme(regex(re))
  .map((s) => {
    let result = re.exec(s);
    return {
      kind: 'numberWithUnit',
      number: result[1],
      unit: result[2],
    };
  })
  .desc('number with unit').mark();
let number = lexeme(regex(/[0-9]+/).map(parseInt)).desc('number').mark();
let id = lexeme(regex(/[a-z_]\w*/i)).desc('identifier').mark();

let atom = numberWithUnit.or(number).or(id);
let group = lazy(() => {
  return lparen.then(expr).skip(rparen)
});
let binop = alt(times, plus, minus);
let expr = alt(seqMap(atom,
  binop,
  atom,
  (left, op, right) => ({
      kind: 'apply',
      func: op,
      args: [left, right]
  })),
  atom,
  group)
  .desc('expression');

let range = seqMap(expr, dots, expr,
  (low, _, high) => ({
      kind: 'range',
      low: low,
      high: high
  })).source();

let field = lazy(() => {
  return seqMap(
    id,
    colon,
    complexType.or(type),
    (id, _, type) => ({
        id: id,
        type: type
    }));
});


let fieldlist = sepByOptTrail(field, comma);

let node = alt(lexeme(string('node')),
  lexeme(string('record')))
  .skip(lbrace)
  .then(fieldlist.map((fields) => ({
      kind: 'record',
      fields: fields
  })))
  .skip(rbrace);

let eitherfield = seqMap(id,
  lbrace,
  fieldlist,
  rbrace,
  (id, _, fields, _2) => ({
      id: id,
      fields: fields,
      kind: 'record',
  })).or(id.map((id) => ({
    id: id,
    type: {
      fields: [],
      kind: 'record',
    },
})));
let eitherfieldlist = sepByOptTrail(eitherfield, comma);

let either = lexeme(string('either'))
  .skip(lbrace)
  .then(eitherfieldlist.map((fields) => ({
      kind: 'either',
      fields: fields
  })))
  .skip(rbrace);
let generic = seqMap(id,
  langle,
  id,
  rangle,
  (base, _, arg, _2) => ({
      kind: 'generic',
      base: base,
      args: [arg],
  }));
let type = alt(range, generic, id);

let complexType = Parsimmon.alt(
  node,
  either);

let param = seqMap(lexeme(string('param')),
  id,
  colon,
  type,
  equals,
  expr,
  semicolon,
  (_, id, _2, type, _3, value, _4) => ({
      kind: 'paramdecl',
      id: id,
      type: type,
      default: value
  }));

let typedecl = seqMap(lexeme(string('type')),
  id,
  colon,
  alt(complexType.skip(semicolon.times(0, 1)),
    type.skip(semicolon)),
  (_, id, _2, type) => ({
      kind: 'typedecl',
      id: id,
      type: type,
  }));

let vardecl = lexeme(string('var'))
  .then(id)
  .skip(colon)
  .then(type)
  .skip(semicolon);

let block = lazy(() => {
  return lbrace
    .then(statement.many())
    .skip(rbrace);
});

let arg = seqMap(id,
  colon,
  type,
  (id, _, type) => ({
      id: id,
      type: type,
  }));

let arglist = lparen
  .then(sepBy(arg, comma))
  .skip(rparen);

let distribution = seqMap(lexeme(string('distribution')),
  id,
  arglist,
  arrow,
  type,
  block,
  (_, id, args, _2, returntype, block) => ({
      kind: 'distributiondecl',
      id: id,
      args: args,
      returntype: returntype,
      code: block
  }));

let returnStmt = lexeme(string('return'))
  .then(expr).map((v) => ({
    kind: 'returnstmt',
    value: v,
}))
  .skip(semicolon);


let statement = Parsimmon.alt(
  param,
  typedecl,
  distribution,
  returnStmt,
  vardecl).source();

// main parser
let file = lazy(() => {
  return lexeme(string('')).then(statement.many());
});

let parse = function(input) {
  let r = file.parse(input);
  r.input = input;
  return r;
}
let parseFile = function(filename) {
  return parse(fs.readFileSync(filename).toString());
}
let consoleOutput = function(parseResult) {
  let r = parseResult;
  let input = r.input;
  if (r.status) {
    console.log(JSON.stringify(r.value, null, 2));
  } else {
    console.log('Parsing failed');
    let startsAt = input.lastIndexOf("\n", r.index);
    if (startsAt == -1) {
      startsAt = r.index;
    } else {
      startsAt += 1;
    }
    let endsAt = input.indexOf("\n", r.index);
    let lineno = 1;
    let nl = -1;
    while (true) {
      let nl = input.indexOf("\n", nl + 1);
      if (nl == -1 || nl > r.index) {
        break;
      }
      lineno += 1;
    }
    console.log('line %d: %s', lineno, input.slice(startsAt, endsAt));
    let w = '';
    for (let i = 0; i < r.index - startsAt + 7 + lineno.toString().length; i += 1) {
      w += ' ';
    }
    console.log('%s^', w);
    //console.log('Starting:', input.slice(r.index, endsAt));

    let unique = [];
    r.expected.forEach((v) => {
      if (unique.indexOf(v) == -1) {
        unique.push(v);
      }
    });
    unique.sort();
    let exp = '';
    unique.forEach((v, i) => {
      exp += v.toString();
      if (i < unique.length - 1) {
        exp += ', ';
      }
    });
    console.log('expected:', exp);
  }
};

module.exports = {
  parse: parse,
  parseFile: parseFile,
  consoleOutput: consoleOutput,
};

if (require.main === module) {
  consoleOutput(parseFile('input.model'));
}
