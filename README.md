# modeling-compiler

This project is a work in progress. It's fairly buggy and quirky but can
provide some value already. The docs aren't very good yet. This project needs a
name, but also the '-compiler' part of the repo name is a inaccurate, as it's
only an interpreter for now.

Setup
-----

First make sure you have `node` and `npm` (node package manager) installed.
On OS X, if you have homebrew, you can run:

    brew install node

You can then get `bower` (another package manager) using `npm`:

    npm install -g bower

Then run `make setup` to get started.

Also, `model.vim` is a vim syntax file you can use. Copy it into
`~/.vim/syntax/` and set your filetype to `model` in `~/.vimrc`:

    autocmd BufRead,BufNewFile *.model set filetype=model

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


### Running Example in REPL

See [examples/toomanybananas/toomanybananas.model](examples/toomanybananas/toomanybananas.model)
code to make sense of this.

    $ node main.js examples/toomanybananas/toomanybananas.model 
    bananas = 0
    notePresent = False
    roommates = [1: Happy, 2: Happy, 3: Happy, 4: Happy, 5: Happy]
    
    Executing step
    bananas = 0
    notePresent = False
    roommates = [1: Hungry, 2: Happy, 3: Happy, 4: Happy, 5: Happy]
    
    > .fire step 3
    bananas = 0
    notePresent = False
    roommates = [1: Hungry, 2: Happy, 3: Hungry, 4: Happy, 5: Happy]
    
    > .fire step 3
    bananas = 0
    notePresent = True
    roommates = [1: Hungry, 2: Happy, 3: GoingToStore, 4: Happy, 5: Happy]
    
    > bananas = 7
    > .fire step 3
    bananas = 7
    notePresent = True
    roommates = [1: Hungry, 2: Happy, 3: ReturningFromStore { carrying: 3 }, 4: Happy, 5: Happy]
    
    > .fire step 3
    bananas = 10
    notePresent = False
    roommates = [1: Hungry, 2: Happy, 3: Hungry, 4: Happy, 5: Happy]
    
    > 

Note that invariants are not automatically checked.

Browser
-------

Run `make bundle.js`. This packages up the interpreter along with its
dependencies into a single JavaScript file using
[webpack](https://webpack.github.io/). (This is a big gotcha if you're changing
the internal code, where you forget this step. Use
`./node_modules/.bin/webpack --watch` for that.)

Set up a web server to serve the top-level directory. For example:

    npm install -g nws
    nws -o

The `-o` will open `index.html` in a web browser as served through that web server.
The first thing that'll do is pull down a model and view file for the default model,
presently [examples/toomanybananas/toomanybananas.model](examples/toomanybananas/toomanybananas.model)
and [examples/toomanybananas/toomanybananas.jsx](examples/toomanybananas/toomanybananas.jsx).
By design, the model and view files aren't compiled into `bundle.js` with
webpack and aren't processed by the web server at all.

You should see the banana visualization come up and you can interact with it
according to the rules of the model. To see other models, host them underneath
the `examples/` directory, then pass a `?model=path/to/model`, stripping off
the `.model` and `.jsx` extensions. For example, navigating to
<http://localhost:3030/?model=elevators/elevators> will load
[examples/elevators/elevators.model](examples/elevators/elevators.model) and
[examples/elevators/elevators.jsx](examples/elevators/elevators.jsx).


Writing a Model
---------------

Coming soon. The most important thing to note is that most things are
pass-by-value (copy semantics), but for loops are by reference.

Writing a View
--------------

This can be tedious but isn't particularly difficult once you get the hang of it.
The nice thing is you've got all of the global state dumped out right below the
SVG by default, so you can build up the view incrementally.

Start with an existing example for the basic structure. The key things you need
to understand are:

- [React](https://facebook.github.io/react/docs/why-react.html) with JSX, which
has some minor extensions to standard JavaScript (you can use ES6 features, by
the way).
- [SVG](https://developer.mozilla.org/en-US/docs/Web/SVG). In particular, you
should familiarize yourself with these common elements:
[g](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/g),
[rect](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/rect),
[circle](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/circle),
[text](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text),
[line](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line), and
[path](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path).
- Coordinate space: (0, 0) is the top left of the canvas, with Y growing
downwards. The current canvas is about 100x100, but one of the dimensions can
be slightly larger depending on how it's resized. We might change this soon, as
other SVG tools seem to default to canvases that are an order of magnitude or
so larger.
- Manually positioning everything is annoying. Hopefully we can find a nicer
solution in the future. `BBox` in [web/util.js](web/util.js) might help.
- Don't be afraid to embrace some "globals" in your view. It's a lot easier
than passing around the model everywhere, for example.

Internals
---------

### Interpreter

The lexer+parser ([parser.js](parser.js)) is written using the
[Parsimmon](https://github.com/jneen/parsimmon) library. It outputs a really
big basically JSON parse tree like what you find in
[output-tokenring.json](output-tokenring.json). Every object in the
parse tree has a "kind" field specifying its type and a "source" field
specifying where it comes from in the input file (for error messages).

After parsing completes, the entire structure is converting into an AST
(abstract syntax tree). There's mostly a one-to-one mapping between a node in
the parse tree and a node in the AST, but the AST is actual JavaScript objects.
There are two kinds of nodes in the AST: [statements](statements/) and
[expressions](expressions/). These refer to [types](types/) and values (value
classes are defined next to the corresponding type).

After the AST is set up, `typecheck()` is called on it, which is invoked
through the entire tree (children before parents). Then `execute()` calls the
top-level initialization statements, if any.

### Tests

Run `make test`.

Unit tests use the [Mocha](https://mochajs.org/) library.  To add a new test
file for a module named *foo*, name it `foo-test.js` and run `git add
foo-test.js`. It will then be invoked on subsequent `make test` runs.

The parser is tested by feeding it a couple of files
([input.model](input.model) and [tokenring.model](tokenring.model)) and
automatically checking their parser output (against [output.json](output.json)
and [output-tokenring.json](output-tokenring.json)). Eventually we'll want more
targeted tests for the parser, but this has worked pretty well so far at
making sure there aren't any regressions.
