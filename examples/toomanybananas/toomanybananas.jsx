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

return fetchRemoteFile('examples/toomanybananas/banana.svg').then(f => {

let bananaSVG = f.getText();

let TooManyBananasView = React.createClass({
  render: function() {
    let banana = <g dangerouslySetInnerHTML={{__html: bananaSVG}}></g>;
    return <g>
      <circle cx={50} cy={50} r={20} />
      {banana}
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

}); // fetch banana.svg
}; // View

module.exports = View;
