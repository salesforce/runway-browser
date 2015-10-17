"use strict";

let Input = require('./input.js');
let Source = require('./source.js');
let process = require('process');
let Parsimmon = require('./bower_components/parsimmon/build/parsimmon.commonjs.js');

// Like .mark() except puts start and end in a 'source' attribute hanging off value.
// The 'input' attribute of the Source values is set later in parse().
Parsimmon.Parser.prototype.source = function() {
  return Parsimmon.Parser.prototype.mark.call(this).map((marked) => {
    marked.value.source = new Source(marked.start, marked.end);
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
let dot = lexeme(string('.'));
let dots = lexeme(string('..'));
let doubleEquals = lexeme(string('=='));
let equals = lexeme(string('='));
let langle = lexeme(string('<'));
let lbrace = lexeme(string('{'));
let lbracket = lexeme(string('['));
let leq = lexeme(string('<='));
let lparen = lexeme(string('('));
let minus = lexeme(string('-'));
let plus = lexeme(string('+'));
let rangle = lexeme(string('>'));
let rbrace = lexeme(string('}'));
let rbracket = lexeme(string(']'));
let req = lexeme(string('>='));
let rparen = lexeme(string(')'));
let semicolon = lexeme(string(';'));
let times = lexeme(string('*'));

let keywords = {};
[
  'distribution',
  'either',
  'else',
  'for',
  'if',
  'in',
  'matches',
  'node',
  'param',
  'print',
  'record',
  'return',
  'rule',
  'type',
  'var',
].forEach((keyword) => {
  keywords[keyword] = lexeme(string(keyword));
});

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
  .source()
  .desc('number with unit');
let number = lexeme(regex(/[0-9]+/).map(parseInt)).desc('number').map((v) => ({
    kind: 'number',
    value: v,
})).source();
let id = lexeme(regex(/[a-z_]\w*/i)).desc('identifier').map((v) => ({
    kind: 'id',
    value: v,
})).source();

let binop = alt(
  times,
  plus,
  minus,
  doubleEquals,
  leq,
  req,
  langle,
  rangle);

let group = lazy(() => {
  return lparen.then(expr).skip(rparen)
});

let lhsmore = lazy(() => alt(
    seqMap(lbracket,
      expr,
      rbracket,
      (_, expr, _2) => ({
          kind: 'index',
          by: expr,
      })),
    seqMap(dot,
      id,
      (_, id) => ({
          kind: 'lookup',
          child: id,
      }))));


let lhshelper = function(lhsparent, more) {
  if (more.length == 0) {
    return lhsparent;
  }
  let ret = more.shift(0);
  ret.parent = lhsparent;
  return lhshelper(ret, more);
};

let lhs = seqMap(id,
  lhsmore.many(),
  lhshelper);


let expratom = lazy(() => alt(
    numberWithUnit,
    number,
    recordvalue,
    group,
    lhs));

let expr = lazy(() => alt(
    seqMap(expratom,
      binop,
      expr,
      (left, op, right) => ({
          kind: 'apply',
          func: op,
          args: [left, right]
      })),
    seqMap(expratom,
      keywords.matches,
      id,
      (expr, _, id) => ({
          kind: 'matches',
          expr: expr,
          variant: id
      })),
    expratom)
    .desc('expression'));

let range = seqMap(expr, dots, expr,
  (low, _, high) => ({
      kind: 'range',
      low: low,
      high: high
  })).source();

let field = lazy(() => seqMap(
    id,
    colon,
    complexType.or(type),
    (id, _, type) => ({
        id: id,
        type: type
    })));


let fieldlist = sepByOptTrail(field, comma).map((fields) => ({
    kind: 'record',
    fields: fields
}));


let fieldvalue = lazy(() => seqMap(
    id,
    colon,
    expr,
    (id, _, expr) => ({
        id: id,
        expr: expr,
    })));


let recordvalue = seqMap(id,
  lbrace,
  sepByOptTrail(fieldvalue, comma),
  rbrace,
  (id, _, fields, _2) => ({
      kind: 'recordvalue',
      type: id,
      fields: fields,
  }));


let record = alt(keywords.node, keywords.record)
  .skip(lbrace)
  .then(fieldlist)
  .skip(rbrace);

let eitherfield = seqMap(id,
  lbrace,
  fieldlist,
  rbrace,
  (id, _, fields, _2) => ({
      id: id,
      type: fields,
  })).or(id.map((id) => ({
    id: id,
    kind: 'enumvariant',
})));
let eitherfieldlist = sepByOptTrail(eitherfield, comma);

let either = keywords.either
  .skip(lbrace)
  .then(eitherfieldlist.map((fields) => ({
      kind: 'either',
      fields: fields
  })))
  .skip(rbrace);

let generic = lazy(() => seqMap(id,
    langle,
    type,
    rangle,
    (base, _, arg, _2) => ({
        kind: 'generic',
        base: base,
        args: [arg],
    })));

let genericIndexable = lazy(() => seqMap(generic,
    lbracket,
    type,
    rbracket,
    (generic, _, indexBy, _2) => {
      generic.indexBy = indexBy;
      return generic;
    }));

let type = alt(range,
  genericIndexable,
  generic,
  id.map((id) => {
    id.kind = 'alias';
    return id;
  }));

let complexType = Parsimmon.alt(
  record,
  either);

let param = seqMap(keywords.param,
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

let typedecl = seqMap(keywords.type,
  id,
  colon,
  alt(complexType.skip(semicolon.times(0, 1)),
    type.skip(semicolon)),
  (_, id, _2, type) => ({
      kind: 'typedecl',
      id: id,
      type: type,
  }));

let vardecl = seqMap(keywords.var,
  id,
  colon,
  type,
  equals.then(expr).times(0, 1),
  semicolon,
  (_, id, _2, type, value, _3) => {
    let o = {
      'kind': 'vardecl',
      id: id,
      type: type,
    };
    if (value.length > 0) {
      o.default = value[0];
    }
    return o;
  });

let block = lazy(() => {
  return lbrace
    .then(statement.many()).map((statements) => ({
      kind: 'sequence',
      statements: statements,
  }))
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

let distribution = seqMap(keywords.distribution,
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

let returnStmt = keywords.return
  .then(expr).map((v) => ({
    kind: 'returnstmt',
    value: v,
}))
  .skip(semicolon);

let assignment = seqMap(
  lhs,
  equals,
  expr,
  semicolon,
  (id, _, expr, _2) => ({
      kind: 'assign',
      id: id,
      expr: expr,
  }));

let print = seqMap(
  keywords.print,
  expr,
  semicolon,
  (_, expr, _2) => ({
      kind: 'print',
      expr: expr,
  }));

let foreachLoop = seqMap(keywords.for,
  id,
  keywords.in,
  expr,
  block,
  (_, id, _2, expr, block) => ({
      kind: 'foreach',
      id: id,
      expr: expr,
      code: block,
  }));

let ifElse = seqMap(keywords.if,
  expr,
  block,
  (keywords.else).then(block).times(0, 1).map((elses) => {
    if (elses.length == 0) {
      return {
        kind: 'sequence',
        statements: [],
      }
    } else {
      return elses[0];
    }
  }),
  (_, condition, thenblock, elseblock) => ({
      kind: 'ifelse',
      condition: condition,
      thenblock: thenblock,
      elseblock: elseblock,
  }));

let rule = seqMap(keywords.rule,
  id,
  block,
  (_, id, block) => ({
      kind: 'rule',
      id: id,
      code: block,
  }));

let rulefor = seqMap(keywords.rule,
  id,
  keywords.for,
  id,
  keywords.in,
  expr,
  block,
  (_, id, _2, variable, _3, expr, block) => ({
      kind: 'rulefor',
      id: id,
      variable: variable,
      expr: expr,
      code: block,
  }));

let statement = Parsimmon.alt(
  param,
  typedecl,
  distribution,
  ifElse,
  foreachLoop,
  assignment,
  print,
  rule,
  rulefor,
  returnStmt,
  vardecl).source();

// main parser
let file = lazy(() => {
  return lexeme(string('')).then(statement.many());
});

// Given an instance of Input, attempt to parse it.
// Either returns an AST or throws an Error.
let parse = function(input) {
  let r = file.parse(input.getText());
  if (r.status) {
    let setInputAll = (obj) => {
      for (var property in obj) {
        var value = obj[property];
        if (value instanceof Source) {
          value.setInput(input);
        } else if (typeof value == 'object') {
          setInputAll(value);
        }
      }
    };
    setInputAll(r.value);
    return r.value;
  } else {
    let at = input.lookup(r.index);
    let expected = [];
    r.expected.forEach((v) => {
      if (expected.indexOf(v) == -1) {
        expected.push(v);
      }
    });
    expected = expected.sort();
    let error = Error(`Parsing failed in ${input.filename} at line ${at.line}, col ${at.col}:
${input.highlight(at)}
Expected one of: ${expected.join(', ')}`);
    error.input = input;
    error.failAt = r.at;
    error.expected = expected;
    throw error;
  }
}
module.exports = {
  parse: parse,
};

if (require.main === module) {
  let filename = 'input.model';
  if (process.argv.length > 2) {
    filename = process.argv[2];
  }
  let parsed = parse(new Input(filename));
  console.log(JSON.stringify(parsed, null, 2));
}
