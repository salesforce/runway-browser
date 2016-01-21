"use strict";

let React = require('React');
let ReactDOM = require('ReactDOM');
let jQuery = require('jquery');
let Tooltip = require('Tooltip');
let Util = require('Util');
let fetchRemoteFile = require('fetchRemoteFile');

let View = function(controller, svg, module) {

let model = module.env;
let tooltip = new Tooltip(jQuery('#tooltip'));

let basename = 'examples/toomanybananas';
return Promise.all([
  fetchRemoteFile(`${basename}/bg.svg`),
  fetchRemoteFile(`${basename}/banana.svg`),
  fetchRemoteFile(`${basename}/happy.svg`),
  fetchRemoteFile(`${basename}/hungry.svg`),
  fetchRemoteFile(`${basename}/note.svg`),
]).then(results => {

let svgs = {
  bg: results[0].getText(),
  banana: results[1].getText(),
  happy: results[2].getText(),
  hungry: results[3].getText(),
  note: results[4].getText(),
};

let bananaCopy = <g
  transform="scale(.2)"
  dangerouslySetInnerHTML={{__html: svgs.banana}}></g>;

let TooManyBananasView = React.createClass({
  render: function() {
    let bananas = [];
    Util.range(model.vars.get('bananas')).forEach(i => {
      let x = 6 + i * 4;
      let y = 28 + i;
      if (i > 3) {
        x = 6 + (i - 4) * 4;
        y -= 15;
      }
      // TODO: I'd like to do the following, but it doesn't seem to display in
      // Chrome until I force the browser to reparse the SVG node. Not sure if
      // that's a Chrome or a React bug. Avoid dynamic numbers of <use> tags
      // for now.
      /*
      bananas.push(<use
        key={`banana-${i}`}
        x={x} y={y}
        xlinkHref="#banana" />);
      */
      bananas.push(<g
        key={`banana-${i}`}
        transform={`translate(${x}, ${y})`}>
          {bananaCopy}
      </g>);
    });

    let note = [];
    if (model.vars.get('notePresent').toString() === 'True') {
      note = <g transform="translate(15 5) scale(.3)"
           dangerouslySetInnerHTML={{__html: svgs.note}}></g>;
    }

    let roommates = [];
    let numGoing = 0;
    let numReturning = 0;
    model.vars.get('roommates').forEach((r, id) => {
      let i = id - 1;
      let key = `roommate-${id}`;
      let happy = false;
      // default to house coordinates
      let x = 30 + i * 10;
      let y = 35 - i * 5;
      r.match({
        Happy: () => {
          happy = true;
        },
        Hungry: h => {
          // defaults work
        },
        GoingToStore: () => {
          x = 75 + numGoing * 12;
          y = 30;
          numGoing += 1;
        },
        ReturningFromStore: rfs => {
          x = 20 - numReturning * 12;
          y = 60;
          Util.range(rfs.lookup('carrying')).forEach(b => {
            roommates.push(<g
              key={`banana-carrying-${id}-${b}`}
              transform={`translate(${x + b*4}, ${y + 10})`}>
                {bananaCopy}
            </g>);
          });
          numReturning += 1;
        },
      })
      roommates.push(<use
        key={key}
        x={x}
        y={y}
        xlinkHref={happy ? '#happy' : '#hungry'} />);
    });

    return <g>
      <defs>
        <g id="happy" transform="scale(.15)"
           dangerouslySetInnerHTML={{__html: svgs.happy}}></g>
        <g id="hungry" transform="scale(.15)"
           dangerouslySetInnerHTML={{__html: svgs.hungry}}></g>
      </defs>
      <g id="bg" dangerouslySetInnerHTML={{__html: svgs.bg}}></g>
      {note}
      {bananas}
      {roommates}
    </g>;
  },
});

let reactComponent = ReactDOM.render(<TooManyBananasView />, svg);

return {
  update: function() {
    // trigger a render
    reactComponent.setState({}, () => {
      tooltip.update();
      console.log('rendered');
    });
  }
};

}); // fetch supporting SVG files
}; // View

module.exports = View;
