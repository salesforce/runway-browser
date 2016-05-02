# runway-browser

This project is a work in progress. It's fairly buggy and quirky but can
provide some value already. The docs aren't very good yet.

Setup
-----

First make sure you have `node` and `npm` (node package manager) installed.
Then run `npm install` to install dependencies.

Run `npm run webpack`. This packages up the interpreter along with its
dependencies into a single JavaScript file using
[webpack](https://webpack.github.io/). (This is a big gotcha if you're changing
the internal code, where you forget this step. Use
`./node_modules/.bin/webpack --watch` for that or `webpack-dev-server`.)

Set up a web server to serve the `dist/` directory. For example:

    npm install -g nws
    nws -d dist -o

The `-o` will open `dist/index.html` in a web browser as served through that web server.
The first thing that'll do is pull down a model and view file for the default model,
presently the Too Many Bananas model. By design, the model and view files
aren't compiled into `bundle.js` with webpack and aren't processed by the web
server at all.

You should see a very basic counter model come up.

To see other models, symlink them underneath the `dist/models/` directory, then
pass a `?model=path/to/model`, stripping off the `.model` and `.js` extensions.
For example, navigating to
<http://localhost:3030/?model=elevators/elevators> will load
`dist/models/elevators/elevators.model` and
`dist/models/elevators/elevators.js(x)`.


Writing a View
--------------

This can be tedious but isn't particularly difficult once you get the hang of it.
The nice thing is you've got all of the global state dumped out right below the
SVG by default, so you can build up the view incrementally.

Start with an existing example for the basic structure. The key things you need
to understand are:

- D3.
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
