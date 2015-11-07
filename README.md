# modeling-compiler

This is still a really early work in progress. The docs aren't very good yet.

Code
----

The lexer+parser ([parser.js](parser.js)) is written using the
[Parsimmon](https://github.com/jneen/parsimmon) library. It outputs a really
big basically JSON parse tree like what you find in
[output-tokenring.json](output-tokenring.json). Every object in the
parse tree has a "kind" field specifying its type and a "source" field
specifying where it comes from in the input file (for error messages).

After parsing completes, the entire structure is converting into an AST
(abstract syntax tree). There's mostly a one-to-one mapping between a node in
the parse tree and a node in the AST, but the AST is actual Javascript objects.
There are two kinds of nodes in the AST: [statements](statements/) and
[expressions](expressions/). These refer to [types](types/) and values (value
classes are defined next to the corresponding type).

After the AST is set up, `typecheck()` is called on it, which is invoked
through the entire tree (children before parents). Then `execute()` calls the
top-level initialization statements, if any.

For now, rules can be fired individually by looking them up in the
[Environment](environment.js) and invoking `fire()`. In the future, there will
be a way to run a model (in a simulation mode and a model checking mode).

Setup
-----

Requires node >=v4.x, bower, npm.

Run `make setup` to get started.

REPL
----

    $ node main.js 
    > 3 * 4
    12
    > type Pair : record { first: 0..9, second: 10..99 };
    > var p : Pair;
    > p
    Pair { first: 0, second: 10 }
    > p.first = 20
    ModelingBoundsError: Cannot assign value of 20 to range undefined: 0..9;
    > p.first = 3
    > p
    Pair { first: 3, second: 10 }
    > type Maybe : either { Nothing, Something { it: 3..5 } }
    > var m : Maybe
    > m
    Nothing
    > m = Something { it: 4 }
    > m
    Something { it: 4 }
    > match m { Something as s => { print s.it; }, Nothing => { print False; } }
    4
    > m = Nothing
    > match m { Something as s => { print s.it; }, Nothing => { print False; } }
    False
    > 


Token Ring
----------

See [tokenring.model](tokenring.model) code first.

    $ node main.js tokenring.model 
    token = InTransit { to: 1 }
    servers = [1: Server { hasToken: False }, 2: Server { hasToken: False }, 3: Server { hasToken: False }, 4: Server { hasToken: False }, 5: Server { hasToken: False }]

    Executing deliverToken
    token = AtServer { at: 1 }
    servers = [1: Server { hasToken: True }, 2: Server { hasToken: False }, 3: Server { hasToken: False }, 4: Server { hasToken: False }, 5: Server { hasToken: False }]

    Executing passToken
    token = InTransit { to: 2 }
    servers = [1: Server { hasToken: False }, 2: Server { hasToken: False }, 3: Server { hasToken: False }, 4: Server { hasToken: False }, 5: Server { hasToken: False }]

    > .fire deliverToken
    token = AtServer { at: 2 }
    servers = [1: Server { hasToken: False }, 2: Server { hasToken: True }, 3: Server { hasToken: False }, 4: Server { hasToken: False }, 5: Server { hasToken: False }]

    > .fire passToken 2
    token = InTransit { to: 3 }
    servers = [1: Server { hasToken: False }, 2: Server { hasToken: False }, 3: Server { hasToken: False }, 4: Server { hasToken: False }, 5: Server { hasToken: False }]

    > .fire deliverToken
    token = AtServer { at: 3 }
    servers = [1: Server { hasToken: False }, 2: Server { hasToken: False }, 3: Server { hasToken: True }, 4: Server { hasToken: False }, 5: Server { hasToken: False }]

    > .fire passToken 3
    token = InTransit { to: 4 }
    servers = [1: Server { hasToken: False }, 2: Server { hasToken: False }, 3: Server { hasToken: False }, 4: Server { hasToken: False }, 5: Server { hasToken: False }]

    > 

Tests
-----

Run `make test`.

Unit tests use the [Mocha](https://mochajs.org/) library.  To add a new test
file for a module named *foo*, name it `foo-test.js` and run `git add
foo-test.js`. It will then be invoked on subsequent `make test` runs.

The parser is tested by feeding it a couple of files
([input.model](input.model) and [tokenring.model](tokenring.model)) and
automatically checking their parser output (against [output.json](output.json)
and [output-tokenring.json](output-tokenring.json)). Eventually we'll want more
targetted tests for the parser, but this has worked pretty well so far at
making sure there aren't any regressions.

Browser
-------

Run `make bundle.js`.

Set up a web server to serve the top-level directory. For example:

    npm install -g nws
    nws -o

Then open `index.html` in a web browser as served through that web server (this
is necessary for your browser to pull down `tokenring.model`). You'll see a
token ring come up and can interact with it according to the rules of the
model.
