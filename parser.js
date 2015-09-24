var Parsimmon = require('./parsimmon/build/parsimmon.commonjs.js');
var fs = require('fs');
var input = fs.readFileSync('input.model.js').toString();

// like .mark() except puts start and end in same object as value
Parsimmon.Parser.prototype.source = function() {
    return Parsimmon.Parser.prototype.mark.call(this).map(function(marked) {
        marked.value.start = marked.start;
        marked.value.end = marked.end;
        return marked.value;
    });
}


var alt = Parsimmon.alt;
var lazy = Parsimmon.lazy;
var optWhitespace = Parsimmon.optWhitespace;
var regex = Parsimmon.regex;
var sepBy = Parsimmon.sepBy;
var seq = Parsimmon.seq;
var seqMap = Parsimmon.seqMap;
var string = Parsimmon.string;
var whitespace = Parsimmon.whitespace;

var sepByOptTrail = function(content, separator) {
    return sepBy(content, separator)
            .skip(separator.or(Parsimmon.succeed()));
}

var comment = regex(/\/\/[^\n]*/).desc('single-line comment');
function lexeme(p) {
    return p.skip(whitespace.or(comment).many());
}

var arrow = lexeme(string('->'));
var colon = lexeme(string(':'));
var comma = lexeme(string(','));
var dots = lexeme(string('..'));
var equals = lexeme(string('='));
var langle = lexeme(string('<'));
var lbrace = lexeme(string('{'));
var lparen = lexeme(string('('));
var minus = lexeme(string('-'));
var plus = lexeme(string('+'));
var rangle = lexeme(string('>'));
var rbrace = lexeme(string('}'));
var rparen = lexeme(string(')'));
var semicolon = lexeme(string(';'));
var times = lexeme(string('*'));

var re = /([0-9]+)([a-z]+)/i;
var numberWithUnit = lexeme(regex(re))
                        .map(function(s) {
                            var result = re.exec(s);
                            return {
                                kind: 'numberWithUnit',
                                number: result[1],
                                unit: result[2],
                        }; })
                        .desc('number with unit').mark();
var number = lexeme(regex(/[0-9]+/).map(parseInt)).desc('number').mark();
var id = lexeme(regex(/[a-z_]\w*/i)).desc('identifier').mark();

var atom = numberWithUnit.or(number).or(id);
var group = lazy(function() { return lparen.then(expr).skip(rparen) });
var binop = alt(times, plus, minus);
var expr = alt(seqMap(atom,
                      binop,
                      atom,
                      function(left, op, right) { return {
                        kind: 'apply',
                        func: op,
                        args: [left, right]
                      }; }),
               atom,
               group)
                 .desc('expression');

var range = seqMap(expr, dots, expr,
                   function(low, _, high) { return {
                        kind: 'range',
                        low: low,
                        high: high
                   }; }).source();

var field = lazy(function() { return seqMap(
                id,
                colon,
                complexType.or(type),
                function(id, _, type) { return {
                    id: id,
                    type: type
                }; });
            });


var fieldlist = sepByOptTrail(field, comma);

var node = lexeme(string('node'))
            .skip(lbrace)
            .then(fieldlist.map(function(fields) {
                return { kind: 'node',
                         fields: fields }; }))
            .skip(rbrace);

var eitherfield = seqMap(id,
                         lbrace,
                         fieldlist,
                         rbrace,
                         function(id, _, fields, _) { return {
                            id: id,
                            fields: fields
                         }; }).or(id);
var eitherfieldlist = sepByOptTrail(eitherfield, comma);

var either = lexeme(string('either'))
            .skip(lbrace)
            .then(eitherfieldlist.map(function(fields) {
                return { kind: 'either',
                         fields: fields }; }))
            .skip(rbrace);
var generic = seqMap(id,
                     langle,
                     id,
                     rangle,
                     function(base, _, arg, _) { return {
                        kind: 'generic',
                        base: base,
                        args: [arg],
                     }; });
var type = alt(range, generic, id);

var complexType = Parsimmon.alt(
                    node,
                    either);

var param = seqMap(lexeme(string('param')),
                   id,
                   colon,
                   type,
                   equals,
                   expr,
                   semicolon,
                   function(_, id, _, type, _, value, _) { return {
                       kind: 'paramdecl',
                       id: id,
                       type: type,
                       default: value
                   }; });

var typedecl = seqMap(lexeme(string('type')),
                      id,
                      colon,
                      complexType.or(type.skip(semicolon)),
                      function(_, id, _, type) { return {
                        kind: 'typedecl',
                        id: id,
                        type: type,
                      }; });

var vardecl = lexeme(string('var'))
                .then(id)
                .skip(colon)
                .then(type)
                .skip(semicolon);

var block = lazy(function() { return lbrace
                                        .then(statement.many())
                                        .skip(rbrace); });

var arg = seqMap(id,
                 colon,
                 type,
                 function(id, _, type) { return {
                    id: id,
                    type: type,
                 }; });

var arglist = lparen
                .then(sepBy(arg, comma))
                .skip(rparen);

var distribution = seqMap(lexeme(string('distribution')),
                          id,
                          arglist,
                          arrow,
                          type,
                          block,
                          function(_, id, args, _, returntype, block) { return {
                               kind: 'distributiondecl',
                               id: id,
                               args: args,
                               returntype: returntype,
                               code: block
                          }; });

var returnStmt = lexeme(string('return'))
                    .then(expr).map(function(v) { return {
                        kind: 'returnstmt',
                        value: v, }; })
                    .skip(semicolon);


var statement = Parsimmon.alt(
                    param,
                    typedecl,
                    distribution,
                    returnStmt,
                    vardecl).source();

// main parser
var file = lazy(function() { return lexeme(string('')).then(statement.many()); });

var parse = function(input) {
    var r = file.parse(input);
    r.input = input;
    return r;
}

var parseFile = function(filename) {
    return parse(fs.readFileSync(filename).toString());
}

var consoleOutput = function(parseResult) {
    var r = parseResult;
    var input = r.input;
    if (r.status) {
        console.log(JSON.stringify(r.value, null, 2));
    } else {
        console.log('Parsing failed');
        var startsAt = input.lastIndexOf("\n", r.index);
        if (startsAt == -1) {
            startsAt = r.index;
        } else {
            startsAt += 1;
        }
        var endsAt = input.indexOf("\n", r.index);
        var lineno = 1;
        var nl = - 1;
        while (true) {
            var nl = input.indexOf("\n", nl + 1);
            if (nl == -1 || nl > r.index)
                break;
            lineno += 1;
        }
        console.log('line %d: %s', lineno, input.slice(startsAt, endsAt));
        var w = '';
        for (var i = 0; i < r.index - startsAt + 7 + lineno.toString().length; i += 1) {
            w += ' ';
        }
        console.log('%s^', w);
        //console.log('Starting:', input.slice(r.index, endsAt));

        var unique = [];
        r.expected.forEach(function(v) {
            if (unique.indexOf(v) == -1) {
                unique.push(v);
            }
        });
        unique.sort();
        var exp = '';
        unique.forEach(function(v, i) {
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
    consoleOutput(parseFile('input.model.js'));
}
