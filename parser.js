"use strict";

let process = require('process');
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
let dot = lexeme(string('.'));
let dots = lexeme(string('..'));
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
  .desc('number with unit').mark();
let number = lexeme(regex(/[0-9]+/).map(parseInt)).desc('number').mark().map((v) => {
  v.kind = 'number';
  return v;
});
let id = lexeme(regex(/[a-z_]\w*/i)).desc('identifier').mark().map((v) => {
  v.kind = 'id';
  return v;
});

let binop = alt(times, plus, minus, langle, rangle, leq, req);

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
    type: {
      fields: [],
      kind: 'record',
    },
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
      nl = input.indexOf("\n", nl + 1);
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
  let filename = 'input.model';
  if (process.argv.length > 2) {
    filename = process.argv[2];
  }
  consoleOutput(parseFile(filename));
}
