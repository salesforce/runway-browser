# runway-browser

This project is a work in progress. It's fairly buggy and quirky but can
provide some value already. The docs aren't very good yet.

Setup
-----

First make sure you have `node` and `npm` (node package manager) installed.
On OS X, if you have homebrew, you can run:

    brew install node

Then run `make setup` to get started.

Also, `model.vim` is a vim syntax file you can use. Copy it into
`~/.vim/syntax/` and set your filetype to `model` in `~/.vimrc`:

    autocmd BufRead,BufNewFile *.model set filetype=model


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
solution in the future. `BBox` in [util.js](util.js) might help.
- Don't be afraid to embrace some "globals" in your view. It's a lot easier
than passing around the model everywhere, for example.
